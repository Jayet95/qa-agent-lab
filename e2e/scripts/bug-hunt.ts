/**
 * Bug hunt: switch on each planted PayDemo bug, one at a time, and run the
 * suite. A bug is "caught" if at least one scenario fails because of it.
 * The detection rate is a direct measure of how good the suite is.
 * Output: reports/bug-hunt.json
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { readRun } from './lib/messages';

const bugs: Record<string, string> = JSON.parse(
  readFileSync(join(__dirname, '../../app/src/lib/bugs.json'), 'utf8'),
);
const root = process.env.REPORT_DIR ?? 'reports';
const CUCUMBER_BIN = join(dirname(require.resolve('@cucumber/cucumber/package.json')), 'bin', 'cucumber.js');

const results = Object.entries(bugs).map(([id, description]) => {
  const dir = join(root, 'bug-hunt', id);
  mkdirSync(dir, { recursive: true });
  console.log(`\n🐞 Planting "${id}" — ${description}`);
  // @health asserts bug mode is off, which would "catch" every bug for free.
  // Run Cucumber's entry point directly (no shell) so the tag expression
  // survives as a single argument on every OS.
  spawnSync(process.execPath, [CUCUMBER_BIN, '--tags', 'not @health'], {
    stdio: 'inherit',
    env: { ...process.env, BUGS: id, RETRY: '0', REPORT_DIR: dir },
  });
  const failed = readRun(join(dir, 'messages.ndjson')).filter((s) => s.status === 'failed');
  console.log(failed.length ? `   ✅ caught by ${failed.length} scenario(s)` : '   ❌ NOT caught');
  return {
    id,
    description,
    caught: failed.length > 0,
    caughtBy: failed.map((s) => ({ feature: s.feature, name: s.name })),
  };
});

const caught = results.filter((r) => r.caught).length;
const report = {
  generatedAt: new Date().toISOString(),
  detectionRate: Math.round((caught / results.length) * 1000) / 10,
  caught,
  total: results.length,
  bugs: results,
};
writeFileSync(join(root, 'bug-hunt.json'), JSON.stringify(report, null, 2));
console.log(`\nBug detection: ${caught}/${results.length} planted bugs caught (${report.detectionRate}%)`);
process.exitCode = caught === results.length ? 0 : 1;
