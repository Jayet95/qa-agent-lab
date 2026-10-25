// Live Lab as a Cloudflare Worker: static page from ./public (ASSETS) plus
// the /api routes. The handlers are the same modules Pages Functions would
// use, so the lab runs on either Workers or Pages.
import { onRequestGet as getConfig } from '../functions/api/config.js';
import { onRequestPost as postRun } from '../functions/api/run.js';
import { onRequestGet as listRuns } from '../functions/api/runs/index.js';
import { onRequestGet as getRun } from '../functions/api/runs/[id].js';
import { onRequestPost as postResults } from '../functions/api/results/[id].js';
import { json } from './../lib/config.js';

const routes = [
  ['GET', /^\/api\/config$/, (ctx) => getConfig(ctx)],
  ['POST', /^\/api\/run$/, (ctx) => postRun(ctx)],
  ['GET', /^\/api\/runs$/, (ctx) => listRuns(ctx)],
  ['GET', /^\/api\/runs\/([^/]+)$/, (ctx, m) => getRun({ ...ctx, params: { id: decodeURIComponent(m[1]) } })],
  ['POST', /^\/api\/results\/([^/]+)$/, (ctx, m) => postResults({ ...ctx, params: { id: decodeURIComponent(m[1]) } })],
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    for (const [method, pattern, handler] of routes) {
      const m = url.pathname.match(pattern);
      if (!m) continue;
      if (request.method !== method) return json({ error: 'Method not allowed' }, 405);
      try {
        return await handler({ request, env, ctx }, m);
      } catch (e) {
        return json({ error: 'Internal error', detail: String(e?.message ?? e).slice(0, 200) }, 500);
      }
    }
    return json({ error: 'Not found' }, 404);
  },
};
