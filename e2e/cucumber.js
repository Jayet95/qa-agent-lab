// Cucumber configuration — see docs/ARCHITECTURE.md for the layering.
const retry = Number(process.env.RETRY ?? 1);
// One visible browser at a time when headed, so the HUD controls one run.
const parallel = Number(process.env.PARALLEL ?? (process.env.HEADED === '1' ? 0 : 2));
const out = process.env.REPORT_DIR ?? 'reports';

module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    requireModule: ['tsx/cjs'],
    require: ['src/**/*.ts'],
    format: [
      'progress-bar',
      `html:${out}/cucumber-report.html`,
      `json:${out}/cucumber-report.json`,
      `message:${out}/messages.ndjson`,
      `junit:${out}/junit.xml`,
    ],
    formatOptions: { snippetInterface: 'async-await' },
    retry,
    ...(retry > 0 ? { retryTagFilter: 'not @no-retry' } : {}),
    parallel,
  },
};
