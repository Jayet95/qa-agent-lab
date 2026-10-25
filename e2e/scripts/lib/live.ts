import { existsSync, readFileSync } from 'node:fs';

/** Live view of a (possibly still running) Cucumber message stream. */
export interface LiveScenario {
  id: string;
  name: string;
  feature: string;
  status: 'queued' | 'running' | 'passed' | 'failed' | 'skipped';
  attempts: number;
  ms?: number;
}

export interface LiveRun {
  scenarios: LiveScenario[];
  finished: boolean;
  summary: { total: number; passed: number; failed: number; running: number; queued: number };
}

const RANK: Record<string, number> = { PASSED: 0, SKIPPED: 1, PENDING: 2, UNDEFINED: 3, AMBIGUOUS: 3, FAILED: 4 };
const ms = (t: { seconds: number; nanos: number }) => t.seconds * 1000 + t.nanos / 1e6;

export function readLive(path: string): LiveRun {
  const empty: LiveRun = { scenarios: [], finished: false, summary: { total: 0, passed: 0, failed: 0, running: 0, queued: 0 } };
  if (!existsSync(path)) return empty;

  const features = new Map<string, string>();
  const pickles = new Map<string, { name: string; uri: string }>();
  const byPickle = new Map<string, LiveScenario>();
  const tc = new Map<string, string>();
  const started = new Map<string, { pickleId: string; at: number; worst: string }>();
  let finished = false;

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let m;
    try { m = JSON.parse(line); } catch { continue; } // partial last line while writing
    if (m.gherkinDocument?.feature) features.set(m.gherkinDocument.uri, m.gherkinDocument.feature.name);
    else if (m.pickle) pickles.set(m.pickle.id, { name: m.pickle.name, uri: m.pickle.uri });
    else if (m.testCase) {
      // Only scenarios selected by the tag filter get a testCase.
      const p = pickles.get(m.testCase.pickleId);
      tc.set(m.testCase.id, m.testCase.pickleId);
      if (p && !byPickle.has(m.testCase.pickleId)) {
        byPickle.set(m.testCase.pickleId, { id: m.testCase.pickleId, name: p.name, feature: features.get(p.uri) ?? p.uri, status: 'queued', attempts: 0 });
      }
    } else if (m.testCaseStarted) {
      const pickleId = tc.get(m.testCaseStarted.testCaseId)!;
      started.set(m.testCaseStarted.id, { pickleId, at: ms(m.testCaseStarted.timestamp), worst: 'PASSED' });
      const s = byPickle.get(pickleId);
      if (s) { s.status = 'running'; s.attempts++; }
    } else if (m.testStepFinished) {
      const st = started.get(m.testStepFinished.testCaseStartedId);
      const status = m.testStepFinished.testStepResult.status as string;
      if (st && (RANK[status] ?? 0) > (RANK[st.worst] ?? 0)) st.worst = status;
    } else if (m.testCaseFinished) {
      const st = started.get(m.testCaseFinished.testCaseStartedId);
      const s = st && byPickle.get(st.pickleId);
      if (st && s) {
        s.ms = Math.round(ms(m.testCaseFinished.timestamp) - st.at);
        s.status = m.testCaseFinished.willBeRetried ? 'running' : st.worst === 'PASSED' ? 'passed' : st.worst === 'SKIPPED' ? 'skipped' : 'failed';
      }
    } else if (m.testRunFinished) finished = true;
  }

  const scenarios = [...byPickle.values()];
  const count = (st: LiveScenario['status']) => scenarios.filter((s) => s.status === st).length;
  return {
    scenarios,
    finished,
    summary: { total: scenarios.length, passed: count('passed'), failed: count('failed'), running: count('running'), queued: count('queued') },
  };
}
