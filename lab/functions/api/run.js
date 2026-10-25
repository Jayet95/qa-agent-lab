import { BUGS, json, PRESETS, RUNS_PER_IP_PER_HOUR } from '../../lib/config.js';
import { dispatch } from '../../lib/github.js';
import { activeRun, hit, saveRun } from '../../lib/store.js';

// POST /api/run  { preset, bug }: start a cloud run of the suite.
export async function onRequestPost({ request, env }) {
  if (!env.GITHUB_TOKEN || !env.LAB_DB || !env.LAB_RESULTS_SECRET) {
    return json({ error: 'The live lab is not configured yet.' }, 503);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const preset = String(body.preset ?? '');
  const bug = String(body.bug ?? 'none');
  if (!(preset in PRESETS)) return json({ error: 'Unknown preset' }, 400);
  if (bug !== 'none' && !(bug in BUGS)) return json({ error: 'Unknown bug' }, 400);

  // One run at a time. If someone else's is in flight, watch theirs.
  const active = await activeRun(env.LAB_DB);
  if (active) return json({ error: 'A run is already in progress; you can watch it.', activeId: active.id }, 409);

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if ((await hit(env.LAB_DB, ip)) > RUNS_PER_IP_PER_HOUR) {
    return json({ error: `That's ${RUNS_PER_IP_PER_HOUR} runs this hour. Please try again later.` }, 429);
  }

  const id = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  const now = Date.now();
  await saveRun(env.LAB_DB, { id, preset, bug, phase: 'queued', phaseAt: { queued: now }, createdAt: now, scenarios: [], summary: null });

  try {
    await dispatch(env, { preset, bug, run_id: id });
  } catch (e) {
    await saveRun(env.LAB_DB, { id, preset, bug, phase: 'error', phaseAt: { queued: now, error: Date.now() }, createdAt: now, scenarios: [], summary: null, error: 'Could not start the cloud run.' });
    return json({ error: 'Could not start the cloud run.', detail: e.message }, 502);
  }
  return json({ id }, 201);
}
