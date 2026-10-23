import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hasDrift, type DriftReport } from './drift';
import type { FieldOutcome } from './types';

export interface JourneyStep {
  at: string;
  step: string;
  detail?: string;
  screenshot?: string;
}

export interface FormRunResult {
  flow: string;
  market: string;
  url: string;
  outcome: 'submitted' | 'rejected' | 'not-submitted';
  fields: FieldOutcome[];
  validationErrors: string[];
  drift: DriftReport;
  journey: JourneyStep[];
}

export const DYNAMIC_DIR = join(process.env.REPORT_DIR ?? 'reports', 'dynamic');

/** Writes field-report-<flow>.json/.md and journey-<flow>.json. */
export function writeArtifacts(run: FormRunResult): { json: string; markdown: string } {
  mkdirSync(DYNAMIC_DIR, { recursive: true });
  const fields = run.fields.map((f) => ({
    label: f.label,
    labelFrom: f.labelFrom,
    kind: f.descriptor.kind,
    key: f.resolution.key,
    source: f.resolution.source,
    confidence: f.resolution.confidence,
    reason: f.resolution.reason,
    value: f.value,
    suggestedSelector: f.suggestedSelector,
    error: f.error,
  }));
  const summary = {
    total: fields.length,
    resolved: fields.filter((f) => f.source !== 'unresolved').length,
    bySource: fields.reduce<Record<string, number>>((acc, f) => ({ ...acc, [f.source]: (acc[f.source] ?? 0) + 1 }), {}),
  };
  const report = { flow: run.flow, market: run.market, url: run.url, outcome: run.outcome, summary, validationErrors: run.validationErrors, drift: run.drift, fields };

  const json = join(DYNAMIC_DIR, `field-report-${run.flow}.json`);
  writeFileSync(json, JSON.stringify(report, null, 2));
  writeFileSync(join(DYNAMIC_DIR, `journey-${run.flow}.json`), JSON.stringify(run.journey, null, 2));

  const md = [
    `## Field report — ${run.flow}`,
    `Outcome: **${run.outcome}** · resolved ${summary.resolved}/${summary.total} · ` +
      Object.entries(summary.bySource).map(([k, v]) => `${k}: ${v}`).join(', '),
    '',
    '| Field | Label from | Resolved as | Source | Conf. | Value | Suggested selector |',
    '|---|---|---|---|---|---|---|',
    ...fields.map((f) => `| ${f.label || '—'} | ${f.labelFrom} | ${f.key ?? '❓'} | ${f.source} | ${f.confidence} | ${f.value ?? ''} | \`${f.suggestedSelector}\` |`),
    run.validationErrors.length ? `\n**Validation errors:** ${run.validationErrors.join('; ')}` : '',
    hasDrift(run.drift)
      ? `\n**Drift vs baseline:** +${run.drift.added.map((a) => a.signature).join(', +') || '0'} ` +
        `· −${run.drift.removed.map((r) => r.signature).join(', −') || '0'} ` +
        `· remapped ${run.drift.remapped.length}`
      : run.drift.hasBaseline ? '\nNo drift vs baseline.' : '\nNo baseline yet (run with UPDATE_BASELINE=1).',
  ].join('\n');
  writeFileSync(join(DYNAMIC_DIR, `field-report-${run.flow}.md`), md);
  return { json, markdown: md };
}
