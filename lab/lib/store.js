// Run state lives in Cloudflare D1 (binding LAB_DB). D1 has a single primary,
// so a snapshot posted from a GitHub runner is immediately visible to a
// viewer anywhere. KV's eventual consistency would make "live" lag.

let schemaReady = false;

async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, data TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL)'),
    db.prepare('CREATE INDEX IF NOT EXISTS runs_updated ON runs(updated)'),
    db.prepare('CREATE TABLE IF NOT EXISTS hits (ip TEXT NOT NULL, hour INTEGER NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (ip, hour))'),
  ]);
  schemaReady = true;
}

export async function getRun(db, id) {
  await ensureSchema(db);
  const row = await db.prepare('SELECT data FROM runs WHERE id = ?').bind(id).first();
  return row ? JSON.parse(row.data) : null;
}

export async function saveRun(db, run) {
  await ensureSchema(db);
  run.updatedAt = Date.now();
  await db
    .prepare('INSERT INTO runs (id, data, created, updated) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(id) DO UPDATE SET data = ?2, updated = ?4')
    .bind(run.id, JSON.stringify(run), run.createdAt ?? run.updatedAt, run.updatedAt)
    .run();
  return run;
}

/** The newest run that is still in flight (and not abandoned). */
export async function activeRun(db) {
  await ensureSchema(db);
  const cutoff = Date.now() - 20 * 60_000;
  const { results } = await db.prepare('SELECT data FROM runs WHERE updated > ? ORDER BY created DESC LIMIT 10').bind(cutoff).all();
  for (const r of results) {
    const run = JSON.parse(r.data);
    if (run.phase !== 'done' && run.phase !== 'error') return run;
  }
  return null;
}

export async function recentRuns(db, limit = 8) {
  await ensureSchema(db);
  const { results } = await db.prepare('SELECT data FROM runs ORDER BY created DESC LIMIT ?').bind(limit).all();
  return results.map((r) => {
    const { id, preset, bug, phase, summary, createdAt, updatedAt } = JSON.parse(r.data);
    return { id, preset, bug, phase, summary, createdAt, updatedAt };
  });
}

/** Counts a run request for this IP in the current hour; returns the new count. */
export async function hit(db, ip) {
  await ensureSchema(db);
  const hour = Math.floor(Date.now() / 3_600_000);
  await db
    .prepare('INSERT INTO hits (ip, hour, n) VALUES (?1, ?2, 1) ON CONFLICT(ip, hour) DO UPDATE SET n = n + 1')
    .bind(ip, hour)
    .run();
  const row = await db.prepare('SELECT n FROM hits WHERE ip = ? AND hour = ?').bind(ip, hour).first();
  return row?.n ?? 1;
}
