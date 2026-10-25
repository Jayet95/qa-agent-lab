import { BUGS, json, PRESETS, repoOf } from '../../lib/config.js';

// GET /api/config: what the page needs to render, incl. whether the lab is wired up
// and, if not, which piece is missing (names only, never values).
export function onRequestGet({ env }) {
  const missing = [
    !env.LAB_DB && 'database (D1 binding LAB_DB)',
    !env.GITHUB_TOKEN && 'secret GITHUB_TOKEN',
    !env.LAB_RESULTS_SECRET && 'secret LAB_RESULTS_SECRET',
  ].filter(Boolean);
  return json({
    configured: missing.length === 0,
    missing,
    repoUrl: `https://github.com/${repoOf(env)}`,
    paydemoUrl: env.PAYDEMO_URL || null,
    dashboardUrl: env.DASHBOARD_URL || null,
    presets: PRESETS,
    bugs: BUGS,
  });
}
