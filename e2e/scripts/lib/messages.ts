import { readFileSync } from 'node:fs';

/** One scenario's outcome, folded from a Cucumber messages (NDJSON) stream. */
export interface ScenarioResult {
  feature: string;
  name: string;
  uri: string;
  tags: string[];
  status: 'passed' | 'failed' | 'skipped';
  attempts: number;
  /** Passed only after a retry. */
  flaky: boolean;
  durationMs: number;
}

type Ts = { seconds: number; nanos: number };
const ms = (t: Ts) => t.seconds * 1000 + t.nanos / 1e6;

const RANK: Record<string, number> = {
  PASSED: 0, SKIPPED: 1, PENDING: 2, UNDEFINED: 3, AMBIGUOUS: 3, FAILED: 4, UNKNOWN: 1,
};

export function readRun(path: string): ScenarioResult[] {
  const features = new Map<string, string>();
  const pickles = new Map<string, { name: string; uri: string; tags: string[] }>();
  const testCases = new Map<string, string>(); // testCaseId -> pickleId
  const started = new Map<string, { testCaseId: string; at: number; worst: string }>();
  const attempts = new Map<string, { status: string; durationMs: number }[]>(); // pickleId -> attempts

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const m = JSON.parse(line);
    if (m.gherkinDocument?.feature) features.set(m.gherkinDocument.uri, m.gherkinDocument.feature.name);
    else if (m.pickle) pickles.set(m.pickle.id, { name: m.pickle.name, uri: m.pickle.uri, tags: m.pickle.tags.map((t: { name: string }) => t.name) });
    else if (m.testCase) testCases.set(m.testCase.id, m.testCase.pickleId);
    else if (m.testCaseStarted) started.set(m.testCaseStarted.id, { testCaseId: m.testCaseStarted.testCaseId, at: ms(m.testCaseStarted.timestamp), worst: 'PASSED' });
    else if (m.testStepFinished) {
      const s = started.get(m.testStepFinished.testCaseStartedId);
      const st = m.testStepFinished.testStepResult.status as string;
      if (s && (RANK[st] ?? 0) > (RANK[s.worst] ?? 0)) s.worst = st;
    } else if (m.testCaseFinished) {
      const s = started.get(m.testCaseFinished.testCaseStartedId);
      if (!s) continue;
      const pickleId = testCases.get(s.testCaseId)!;
      const list = attempts.get(pickleId) ?? [];
      list.push({ status: s.worst, durationMs: ms(m.testCaseFinished.timestamp) - s.at });
      attempts.set(pickleId, list);
    }
  }

  const results: ScenarioResult[] = [];
  for (const [pickleId, list] of attempts) {
    const p = pickles.get(pickleId)!;
    const last = list[list.length - 1];
    const status = last.status === 'PASSED' ? 'passed' : last.status === 'SKIPPED' ? 'skipped' : 'failed';
    results.push({
      feature: features.get(p.uri) ?? p.uri,
      name: p.name,
      uri: p.uri,
      tags: p.tags,
      status,
      attempts: list.length,
      flaky: status === 'passed' && list.length > 1,
      durationMs: Math.round(list.reduce((sum, a) => sum + a.durationMs, 0)),
    });
  }
  return results;
}
