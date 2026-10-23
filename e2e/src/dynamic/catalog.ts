import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * dynamic-field-catalog.json — the reader's memory. Fields resolved with
 * enough confidence are learned here, so next run they resolve instantly
 * and deterministically ("catalog" source) instead of being guessed again.
 */
export interface CatalogEntry {
  key: string;
  learnedFrom: 'fuzzy' | 'semantic' | 'type' | 'manual';
  confidence: number;
  markets: string[];
  hits: number;
  firstSeen: string;
  lastSeen: string;
}

export interface CatalogFile {
  version: 1;
  entries: Record<string, CatalogEntry>;
}

export const CATALOG_PATH = join(__dirname, '..', '..', 'dynamic', 'dynamic-field-catalog.json');
export const LEARN_THRESHOLD = 0.75;

export function loadCatalog(path = CATALOG_PATH): CatalogFile {
  if (!existsSync(path)) return { version: 1, entries: {} };
  return JSON.parse(readFileSync(path, 'utf8')) as CatalogFile;
}

export function saveCatalog(catalog: CatalogFile, path = CATALOG_PATH) {
  mkdirSync(dirname(path), { recursive: true });
  const sorted = Object.fromEntries(Object.entries(catalog.entries).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(path, JSON.stringify({ version: 1, entries: sorted }, null, 2) + '\n');
}

/**
 * Per-worker learning. Workers run in parallel, so they never write the
 * shared catalog directly: learned entries go to reports/dynamic/learned/,
 * and `npm run catalog -- merge` folds them in (with hygiene) afterwards.
 */
export class LearningCatalog {
  private readonly learned: Record<string, CatalogEntry> = {};

  constructor(private readonly base: CatalogFile = loadCatalog()) {}

  lookup(signature: string): CatalogEntry | undefined {
    return this.learned[signature] ?? this.base.entries[signature];
  }

  learn(signature: string, key: string, source: CatalogEntry['learnedFrom'], confidence: number, market: string) {
    const now = new Date().toISOString();
    const prev = this.lookup(signature);
    this.learned[signature] = {
      key,
      learnedFrom: prev?.learnedFrom ?? source,
      confidence: Math.max(prev?.confidence ?? 0, confidence),
      markets: [...new Set([...(prev?.markets ?? []), market])].sort(),
      hits: (prev?.hits ?? 0) + 1,
      firstSeen: prev?.firstSeen ?? now,
      lastSeen: now,
    };
  }

  /** Record a hit on an existing entry (keeps lastSeen fresh for hygiene). */
  touch(signature: string, market: string) {
    const prev = this.lookup(signature);
    if (prev) this.learn(signature, prev.key, prev.learnedFrom, prev.confidence, market);
  }

  flush(dir: string) {
    if (!Object.keys(this.learned).length) return;
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `learned-${process.pid}-${Date.now()}.json`), JSON.stringify(this.learned, null, 2));
  }
}
