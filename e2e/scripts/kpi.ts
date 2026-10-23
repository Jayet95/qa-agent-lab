/**
 * Turns a Cucumber run into quality KPIs: pass rate, flakiness, duration,
 * coverage per feature and per risk tag. Output: reports/kpi.json
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readRun, type ScenarioResult } from './lib/messages';

const dir = process.env.REPORT_DIR ?? 'reports';
const scenarios = readRun(join(dir, 'messages.ndjson'));

const count = (xs: ScenarioResult[], status: ScenarioResult['status']) => xs.filter((s) => s.status === status).length;
const summary = (xs: ScenarioResult[]) => ({
  total: xs.length,
  passed: count(xs, 'passed'),
  failed: count(xs, 'failed'),
  flaky: xs.filter((s) => s.flaky).length,
});

const groupBy = (key: (s: ScenarioResult) => string[]) => {
  const groups = new Map<string, ScenarioResult[]>();
  for (const s of scenarios) for (const k of key(s)) groups.set(k, [...(groups.get(k) ?? []), s]);
  return [...groups].map(([name, xs]) => ({ name, ...summary(xs) })).sort((a, b) => b.total - a.total);
};

const totals = summary(scenarios);
const kpi = {
  generatedAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA?.slice(0, 7) ?? null,
  totals,
  passRate: totals.total ? Math.round((totals.passed / totals.total) * 1000) / 10 : 0,
  flakyRate: totals.total ? Math.round((totals.flaky / totals.total) * 1000) / 10 : 0,
  durationMs: scenarios.reduce((sum, s) => sum + s.durationMs, 0),
  byFeature: groupBy((s) => [s.feature]),
  byTag: groupBy((s) => s.tags.filter((t) => ['@smoke', '@critical', '@regression'].includes(t))),
  slowest: [...scenarios].sort((a, b) => b.durationMs - a.durationMs).slice(0, 5)
    .map(({ feature, name, durationMs }) => ({ feature, name, durationMs })),
  scenarios,
};

writeFileSync(join(dir, 'kpi.json'), JSON.stringify(kpi, null, 2));
console.log(
  `KPIs: ${totals.passed}/${totals.total} passed (${kpi.passRate}%), ` +
  `${totals.flaky} flaky, ${(kpi.durationMs / 1000).toFixed(1)}s scenario time → ${join(dir, 'kpi.json')}`,
);
