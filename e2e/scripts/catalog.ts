/**
 * Catalog maintenance for the dynamic DOM reader.
 *
 *   npm run catalog -- merge     fold reports/dynamic/learned/*.json into the catalog
 *   npm run catalog -- hygiene   flag conflicts, prune stale entries, sort
 *   npm run catalog -- report    print what the catalog knows
 *
 * The catalog is committed, so every change shows up in code review.
 */
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { loadCatalog, saveCatalog, type CatalogEntry, type CatalogFile } from '../src/dynamic/catalog';

const LEARNED_DIR = join(process.env.REPORT_DIR ?? 'reports', 'dynamic', 'learned');
const STALE_DAYS = Number(process.env.STALE_DAYS ?? 90);

function merge(catalog: CatalogFile): string[] {
  const conflicts: string[] = [];
  if (!existsSync(LEARNED_DIR)) return conflicts;
  const files = readdirSync(LEARNED_DIR).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const learned = JSON.parse(readFileSync(join(LEARNED_DIR, file), 'utf8')) as Record<string, CatalogEntry>;
    for (const [sig, entry] of Object.entries(learned)) {
      const prev = catalog.entries[sig];
      if (prev && prev.key !== entry.key) {
        conflicts.push(`${sig}: catalog says "${prev.key}", a run resolved "${entry.key}" — kept the catalog value`);
        continue;
      }
      catalog.entries[sig] = prev
        ? {
            ...prev,
            confidence: Math.max(prev.confidence, entry.confidence),
            markets: [...new Set([...prev.markets, ...entry.markets])].sort(),
            hits: prev.hits + entry.hits,
            lastSeen: entry.lastSeen > prev.lastSeen ? entry.lastSeen : prev.lastSeen,
          }
        : entry;
    }
  }
  rmSync(LEARNED_DIR, { recursive: true, force: true });
  console.log(`Merged ${files.length} learned file(s).`);
  return conflicts;
}

function hygiene(catalog: CatalogFile): string[] {
  const notes: string[] = [];
  const cutoff = Date.now() - STALE_DAYS * 864e5;
  for (const [sig, e] of Object.entries(catalog.entries)) {
    if (e.learnedFrom !== 'manual' && Date.parse(e.lastSeen) < cutoff) {
      delete catalog.entries[sig];
      notes.push(`pruned stale "${sig}" (not seen for ${STALE_DAYS}+ days)`);
    }
  }
  // Same label meaning different things in different control kinds is suspicious.
  const byLabel = new Map<string, Set<string>>();
  for (const [sig, e] of Object.entries(catalog.entries)) {
    const label = sig.split('|').slice(1).join('|');
    byLabel.set(label, new Set([...(byLabel.get(label) ?? []), e.key]));
  }
  for (const [label, keys] of byLabel) {
    if (keys.size > 1) notes.push(`ambiguous label "${label}" maps to ${[...keys].join(' / ')} — review`);
  }
  return notes;
}

function report(catalog: CatalogFile) {
  const rows = Object.entries(catalog.entries);
  console.log(`\nCatalog: ${rows.length} entries\n`);
  console.log('signature'.padEnd(36), 'key'.padEnd(14), 'from'.padEnd(9), 'conf', 'hits', 'markets');
  for (const [sig, e] of rows) {
    console.log(sig.padEnd(36), e.key.padEnd(14), e.learnedFrom.padEnd(9), String(e.confidence).padEnd(4), String(e.hits).padEnd(4), e.markets.join(','));
  }
}

const cmd = process.argv[2] ?? 'report';
const catalog = loadCatalog();
if (cmd === 'merge' || cmd === 'hygiene') {
  const notes = [...(cmd === 'merge' ? merge(catalog) : []), ...hygiene(catalog)];
  saveCatalog(catalog);
  notes.forEach((n) => console.log(`  • ${n}`));
  console.log(notes.length ? `${notes.length} note(s).` : 'Catalog is clean.');
}
report(catalog);
