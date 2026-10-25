/**
 * Assembles the published quality site: dashboard + Cucumber HTML report +
 * raw JSON. Data is inlined as data.js so the page also works from disk.
 * Output: ../site
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const reports = process.env.REPORT_DIR ?? 'reports';
const site = join('..', 'site');
mkdirSync(site, { recursive: true });

const readJson = (p: string) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);

const kpi = readJson(join(reports, 'kpi.json'));
if (!kpi) throw new Error('reports/kpi.json missing — run the suite and `npm run kpi` first');
const bugHunt = readJson(join(reports, 'bug-hunt.json'));
const dynDir = join(reports, 'dynamic');
const dynamic = existsSync(dynDir)
  ? readdirSync(dynDir).filter((f) => /^field-report-signup-[a-z]+\.json$/.test(f)).sort().map((f) => readJson(join(dynDir, f)))
  : [];

writeFileSync(join(site, 'data.js'), `window.QA_DATA = ${JSON.stringify({ kpi, bugHunt, dynamic })};\n`);
copyFileSync(join('..', 'dashboard', 'index.html'), join(site, 'index.html'));
for (const f of ['cucumber-report.html', 'kpi.json', 'bug-hunt.json']) {
  if (existsSync(join(reports, f))) copyFileSync(join(reports, f), join(site, f));
}
console.log(`Site built → ${site} (${dynamic.length} dynamic flow report(s), bug hunt: ${bugHunt ? 'yes' : 'no'})`);
