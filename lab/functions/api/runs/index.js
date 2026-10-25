import { json } from '../../../lib/config.js';
import { activeRun, recentRuns } from '../../../lib/store.js';

// GET /api/runs: the in-flight run (if any) and recent runs.
export async function onRequestGet({ env }) {
  if (!env.LAB_DB) return json({ active: null, recent: [] });
  const [active, recent] = await Promise.all([activeRun(env.LAB_DB), recentRuns(env.LAB_DB)]);
  return json({ active: active?.id ?? null, recent });
}
