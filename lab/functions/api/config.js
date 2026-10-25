import { BUGS, json, PRESETS, repoOf } from '../../lib/config.js';

// GET /api/config — what the page needs to render, incl. whether the lab is wired up.
export function onRequestGet({ env }) {
  return json({
    configured: Boolean(env.GITHUB_TOKEN && env.LAB_DB && env.LAB_RESULTS_SECRET),
    repoUrl: `https://github.com/${repoOf(env)}`,
    paydemoUrl: env.PAYDEMO_URL || null,
    dashboardUrl: env.DASHBOARD_URL || null,
    presets: PRESETS,
    bugs: BUGS,
  });
}
