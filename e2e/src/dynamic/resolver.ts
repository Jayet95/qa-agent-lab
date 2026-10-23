import type { LearningCatalog } from './catalog';
import { displayLabel, type FieldDescriptor, type Resolution } from './types';
import { SEMANTIC_RULES, SYNONYMS, TYPE_DEFAULTS } from './vocabulary';

export const FUZZY_THRESHOLD = 0.8;

/** "SSN (last 4 digits)" → "ssn last 4 digits"; drops "(optional)" noise. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(optional\)|optional/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Sørensen–Dice coefficient over character bigrams (0..1). */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const grams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) ?? 0) + 1);
    return m;
  };
  const ga = grams(a);
  const gb = grams(b);
  let overlap = 0;
  for (const [g, n] of ga) overlap += Math.min(n, gb.get(g) ?? 0);
  return (2 * overlap) / (a.length - 1 + b.length - 1);
}

/** Stable identity of a field across runs: control kind + normalized name. */
export function signatureOf(d: FieldDescriptor): string {
  return `${d.kind}|${normalize(displayLabel(d).text)}`;
}

/**
 * catalog → fuzzy → semantic map → type. Each layer is cheaper to trust than
 * the next; whatever resolves confidently is learned into the catalog.
 */
export function resolveField(d: FieldDescriptor, catalog: LearningCatalog, market: string): Resolution {
  const signature = signatureOf(d);
  const label = normalize(displayLabel(d).text);

  // 1. Catalog — learned on a previous run.
  const known = catalog.lookup(signature);
  if (known) {
    catalog.touch(signature, market);
    return { key: known.key, source: 'catalog', confidence: known.confidence, signature, reason: `learned ${known.hits}× (${known.learnedFrom})` };
  }

  // 2. Fuzzy — close match to a known phrasing.
  let best = { key: '', score: 0, phrase: '' };
  for (const [key, phrases] of Object.entries(SYNONYMS)) {
    for (const phrase of phrases) {
      const score = similarity(label, phrase);
      if (score > best.score) best = { key, score, phrase };
    }
  }
  if (best.score >= FUZZY_THRESHOLD) {
    const r: Resolution = { key: best.key, source: 'fuzzy', confidence: round(best.score), signature, reason: `≈ "${best.phrase}"` };
    catalog.learn(signature, r.key!, 'fuzzy', r.confidence, market);
    return r;
  }

  // 3. Semantic map — keyword rules over label + placeholder.
  const haystack = [displayLabel(d).text, d.placeholder ?? ''].join(' ');
  const rule = SEMANTIC_RULES.find((r) => r.test.test(haystack));
  if (rule) {
    const r: Resolution = { key: rule.key, source: 'semantic', confidence: 0.8, signature, reason: `matched ${rule.test}` };
    catalog.learn(signature, r.key!, 'semantic', r.confidence, market);
    return r;
  }

  // 4. Type — fall back on what the control is.
  const byType = TYPE_DEFAULTS[d.kind];
  if (byType) {
    return { key: byType, source: 'type', confidence: 0.6, signature, reason: `${d.kind} control` };
  }

  return { key: null, source: 'unresolved', confidence: 0, signature, reason: 'no layer recognised it' };
}

const round = (n: number) => Math.round(n * 100) / 100;
