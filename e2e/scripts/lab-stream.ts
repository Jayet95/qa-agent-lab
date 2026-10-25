/**
 * Streams a CI run's progress to the Live Lab (Cloudflare Pages) so a
 * visitor can watch scenarios pass/fail in real time.
 *
 *   tsx scripts/lab-stream.ts watch   # post snapshots until the run finishes
 *   tsx scripts/lab-stream.ts final   # post the final result (always run)
 *
 * Env: LAB_URL, LAB_RUN_ID, LAB_RESULTS_SECRET, REPORT_DIR, CUCUMBER_EXIT
 * Does nothing (exit 0) when LAB_URL isn't configured — CI never fails on it.
 */
import { join } from 'node:path';
import { readLive } from './lib/live';

const { LAB_URL, LAB_RUN_ID, LAB_RESULTS_SECRET } = process.env;
const file = join(process.env.REPORT_DIR ?? 'reports', 'messages.ndjson');
const ghRunUrl = process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : null;

async function post(body: object) {
  if (!LAB_URL || !LAB_RUN_ID || !LAB_RESULTS_SECRET) return;
  try {
    const res = await fetch(`${LAB_URL.replace(/\/$/, '')}/api/results/${LAB_RUN_ID}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-lab-secret': LAB_RESULTS_SECRET },
      body: JSON.stringify({ ...body, ghRunUrl }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.warn(`lab-stream: ${res.status} ${await res.text()}`);
  } catch (e) {
    console.warn(`lab-stream: ${(e as Error).message}`);
  }
}

async function watch() {
  let last = '';
  const deadline = Date.now() + 15 * 60_000;
  while (Date.now() < deadline) {
    const live = readLive(file);
    const snapshot = JSON.stringify(live);
    if (snapshot !== last && live.scenarios.length) {
      last = snapshot;
      await post({ phase: 'running', scenarios: live.scenarios, summary: live.summary });
    }
    if (live.finished) return;
    await new Promise((r) => setTimeout(r, 1500));
  }
}

async function final() {
  const live = readLive(file);
  await post({
    phase: 'done',
    scenarios: live.scenarios,
    summary: live.summary,
    exitCode: Number(process.env.CUCUMBER_EXIT ?? (live.summary.failed ? 1 : 0)),
  });
  console.log(`lab-stream: final — ${live.summary.passed}/${live.summary.total} passed, ${live.summary.failed} failed`);
}

const mode = process.argv[2];
(mode === 'watch' ? watch() : mode === 'final' ? final() : Promise.reject(new Error('usage: lab-stream.ts watch|final')))
  .catch((e) => { console.warn(e.message); });
