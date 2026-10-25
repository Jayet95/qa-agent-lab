import { BUGS, json, PHASES, PRESETS, RUN_ID, TERMINAL } from '../../../lib/config.js';
import { getRun, saveRun } from '../../../lib/store.js';

/** Constant-time string comparison for the shared secret. */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// POST /api/results/:id — progress pushed from the GitHub Actions run.
export async function onRequestPost({ request, params, env }) {
  const id = String(params.id);
  if (!RUN_ID.test(id) || !env.LAB_DB) return json({ error: 'Not found' }, 404);
  if (!safeEqual(request.headers.get('x-lab-secret'), env.LAB_RESULTS_SECRET)) return json({ error: 'Forbidden' }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!PHASES.includes(body.phase)) return json({ error: 'Unknown phase' }, 400);

  const now = Date.now();
  // A run dispatched straight from GitHub's UI has no record yet — create one.
  const run = (await getRun(env.LAB_DB, id)) ?? { id, preset: 'manual', bug: 'none', phase: 'queued', phaseAt: {}, createdAt: now, scenarios: [], summary: null };

  // Runs started from GitHub's UI (not this page) learn what they're running
  // from CI's first report. Page-started runs already know, and keep theirs.
  if (run.preset === 'manual') {
    if (body.preset in PRESETS) run.preset = body.preset;
    if (body.bug === 'none' || body.bug in BUGS) run.bug = body.bug;
  }

  // Never move backwards out of a final state.
  if (!TERMINAL.has(run.phase)) {
    run.phase = body.phase;
    run.phaseAt = { ...run.phaseAt, [body.phase]: run.phaseAt?.[body.phase] ?? now };
  }
  if (Array.isArray(body.scenarios)) run.scenarios = body.scenarios.slice(0, 200);
  if (body.summary) run.summary = body.summary;
  if (typeof body.exitCode === 'number') run.exitCode = body.exitCode;
  if (body.error) run.error = String(body.error).slice(0, 300);
  if (typeof body.ghRunUrl === 'string' && body.ghRunUrl.startsWith('https://github.com/')) run.ghRunUrl = body.ghRunUrl;

  await saveRun(env.LAB_DB, run);
  return json({ ok: true });
}
