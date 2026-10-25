import { json, RUN_ID, TERMINAL } from '../../../lib/config.js';
import { findRun } from '../../../lib/github.js';
import { getRun, saveRun } from '../../../lib/store.js';

const GH_CHECK_EVERY_MS = 8000;
const QUEUE_TIMEOUT_MS = 20 * 60_000;

// GET /api/runs/:id: live state of one run (polled by the page).
export async function onRequestGet({ params, env }) {
  const id = String(params.id);
  if (!RUN_ID.test(id) || !env.LAB_DB) return json({ error: 'Not found' }, 404);
  const run = await getRun(env.LAB_DB, id);
  if (!run) return json({ error: 'Not found' }, 404);

  // While in flight, occasionally ask GitHub how the job is doing: this
  // fills in the run link and catches runs that died without reporting.
  if (!TERMINAL.has(run.phase) && env.GITHUB_TOKEN && Date.now() - (run.ghCheckedAt ?? 0) > GH_CHECK_EVERY_MS) {
    run.ghCheckedAt = Date.now();
    const gh = await findRun(env, id).catch(() => null);
    if (gh) {
      run.ghRunUrl ??= gh.url;
      run.ghStatus = gh.status;
      if (gh.status === 'completed' && !TERMINAL.has(run.phase)) {
        run.phase = 'error';
        run.error = 'The cloud run ended without reporting results. See the GitHub run.';
        run.phaseAt = { ...run.phaseAt, error: Date.now() };
      }
    } else if (Date.now() - run.createdAt > QUEUE_TIMEOUT_MS) {
      run.phase = 'error';
      run.error = 'The run never started on GitHub.';
    }
    await saveRun(env.LAB_DB, run);
  }
  return json(run);
}
