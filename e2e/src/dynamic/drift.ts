import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FieldOutcome } from './types';

/**
 * Drift = the form changed since its committed baseline: fields added,
 * removed, or now resolving to a different meaning. Baselines live in
 * e2e/dynamic/baselines/<flow>.json; refresh with UPDATE_BASELINE=1.
 */
export interface BaselineField {
  signature: string;
  key: string | null;
}

export interface DriftReport {
  flow: string;
  hasBaseline: boolean;
  added: BaselineField[];
  removed: BaselineField[];
  remapped: { signature: string; from: string | null; to: string | null }[];
}

const BASELINE_DIR = join(__dirname, '..', '..', 'dynamic', 'baselines');

export function detectDrift(flow: string, fields: FieldOutcome[]): DriftReport {
  const current: BaselineField[] = fields.map((f) => ({ signature: f.resolution.signature, key: f.resolution.key }));
  const path = join(BASELINE_DIR, `${flow}.json`);

  if (process.env.UPDATE_BASELINE === '1') {
    mkdirSync(BASELINE_DIR, { recursive: true });
    writeFileSync(path, JSON.stringify(current, null, 2) + '\n');
  }
  if (!existsSync(path)) return { flow, hasBaseline: false, added: [], removed: [], remapped: [] };

  const baseline = JSON.parse(readFileSync(path, 'utf8')) as BaselineField[];
  const bySig = new Map(baseline.map((b) => [b.signature, b]));
  const curSigs = new Set(current.map((c) => c.signature));

  return {
    flow,
    hasBaseline: true,
    added: current.filter((c) => !bySig.has(c.signature)),
    removed: baseline.filter((b) => !curSigs.has(b.signature)),
    remapped: current
      .filter((c) => bySig.has(c.signature) && bySig.get(c.signature)!.key !== c.key)
      .map((c) => ({ signature: c.signature, from: bySig.get(c.signature)!.key, to: c.key })),
  };
}

export const hasDrift = (d: DriftReport) => d.added.length + d.removed.length + d.remapped.length > 0;
