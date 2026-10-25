/**
 * Test Runner Console — a local dashboard to run the suite from the browser.
 *
 *   npm run console   →   http://localhost:4000
 *
 * Pick features / tags / individual scenarios, choose options (headed with
 * the HUD, workers, retries, planted bugs, mobile viewport), start a run and
 * watch every scenario go green or red live. Zero dependencies: node:http +
 * Server-Sent Events. One run at a time.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { dirname, extname, join, normalize, relative, resolve, sep } from 'node:path';

const PORT = Number(process.env.CONSOLE_PORT ?? 4000);
const ROOT = resolve(__dirname, '..');                 // e2e/
const REPORTS = join(ROOT, 'reports');
const RUNS_DIR = join(REPORTS, 'runs');
const SITE = resolve(ROOT, '..', 'site');
const APP_DIST = resolve(ROOT, '..', 'app', 'dist');
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8081';
const CUCUMBER = join(dirname(require.resolve('@cucumber/cucumber/package.json')), 'bin', 'cucumber.js');
const BUGS: Record<string, string> = JSON.parse(readFileSync(resolve(ROOT, '..', 'app', 'src', 'lib', 'bugs.json'), 'utf8'));
const HISTORY = join(RUNS_DIR, 'history.json');

mkdirSync(RUNS_DIR, { recursive: true });

// ── Scenario catalogue (from a Cucumber dry run) ────────────────────────
interface Scenario { id: string; name: string; tags: string[]; uri: string }
interface Feature { name: string; uri: string; tag: string; scenarios: Scenario[] }

// Cucumber parses "format:path", so paths are passed RELATIVE to e2e/ — an absolute
// Windows path's drive-letter colon would be misread as a separator.
const rel = (abs: string) => relative(ROOT, abs).split(sep).join('/');

function listScenarios(): Promise<Feature[]> {
  const out = join(RUNS_DIR, 'dry-run.ndjson');
  return new Promise((done, fail) => {
    const p = spawn(process.execPath, [CUCUMBER, '--dry-run', '--format', `message:${rel(out)}`], {
      cwd: ROOT, env: { ...process.env, PARALLEL: '0' }, stdio: 'ignore',
    });
    p.on('error', fail);
    p.on('close', () => {
      if (!existsSync(out)) return fail(new Error('Could not list scenarios (cucumber dry run failed)'));
      const msgs = readFileSync(out, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
      const features = new Map<string, Feature>();
      for (const m of msgs) {
        if (m.gherkinDocument?.feature) {
          const f = m.gherkinDocument.feature;
          features.set(m.gherkinDocument.uri, { name: f.name, uri: m.gherkinDocument.uri, tag: f.tags[0]?.name ?? '', scenarios: [] });
        }
      }
      for (const m of msgs) {
        if (m.pickle) {
          features.get(m.pickle.uri)?.scenarios.push({
            id: m.pickle.id, name: m.pickle.name, uri: m.pickle.uri, tags: m.pickle.tags.map((t: { name: string }) => t.name),
          });
        }
      }
      done([...features.values()].sort((a, b) => a.name.localeCompare(b.name)));
    });
  });
}

// ── Runs ─────────────────────────────────────────────────────────────────
type Status = 'queued' | 'running' | 'passed' | 'failed' | 'skipped';
interface RunOptions {
  kind: 'suite' | 'bug-hunt';
  tags?: string;
  names?: string[];
  headed?: boolean;
  workers?: number;
  retry?: number;
  bugs?: string[];
  mobile?: boolean;
}
interface RunState {
  id: string;
  kind: RunOptions['kind'];
  options: RunOptions;
  command: string;
  startedAt: string;
  finishedAt?: string;
  state: 'running' | 'finished' | 'stopped' | 'error';
  exitCode?: number | null;
  scenarios: Record<string, { name: string; feature: string; status: Status; attempts: number; ms?: number }>;
  log: string[];
}

let current: { run: RunState; child: ChildProcess; clients: Set<ServerResponse>; timer?: NodeJS.Timeout; poll?: () => void } | null = null;
const finished = new Map<string, RunState>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const history = (): any[] =>
  existsSync(HISTORY) ? JSON.parse(readFileSync(HISTORY, 'utf8')) : [];

function summarize(run: RunState) {
  const list = Object.values(run.scenarios);
  return {
    total: list.length,
    passed: list.filter((s) => s.status === 'passed').length,
    failed: list.filter((s) => s.status === 'failed').length,
    flaky: list.filter((s) => s.status === 'passed' && s.attempts > 1).length,
  };
}

function broadcast(event: object) {
  if (!current) return;
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const c of current.clients) c.write(data);
}

function pushLog(text: string) {
  if (!current) return;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || /^\.+$/.test(line.trim())) continue; // skip progress dots
    current.run.log.push(line);
    if (current.run.log.length > 2000) current.run.log.shift();
    broadcast({ type: 'log', line });
  }
}

/** Follows the run's Cucumber message stream and turns it into live scenario states. */
function followMessages(file: string) {
  let offset = 0;
  let carry = '';
  const pickles = new Map<string, { name: string; uri: string }>();
  const features = new Map<string, string>();
  const tc = new Map<string, string>();               // testCaseId -> pickleId
  const started = new Map<string, { pickleId: string; at: number; worst: string }>();
  const rank: Record<string, number> = { PASSED: 0, SKIPPED: 1, PENDING: 2, UNDEFINED: 3, AMBIGUOUS: 3, FAILED: 4 };

  return () => {
    if (!current || !existsSync(file)) return;
    const size = statSync(file).size;
    if (size <= offset) return;
    const fd = readFileSync(file);
    const chunk = carry + fd.subarray(offset, size).toString('utf8');
    offset = size;
    const lines = chunk.split('\n');
    carry = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      const m = JSON.parse(line);
      const run = current.run;
      if (m.gherkinDocument?.feature) features.set(m.gherkinDocument.uri, m.gherkinDocument.feature.name);
      // Every parsed scenario gets a pickle; only the ones selected by the
      // tag/name filters get a testCase — so the live list starts there.
      else if (m.pickle) pickles.set(m.pickle.id, { name: m.pickle.name, uri: m.pickle.uri });
      else if (m.testCase) {
        const id = m.testCase.pickleId as string;
        const p = pickles.get(id);
        tc.set(m.testCase.id, id);
        if (p && !run.scenarios[id]) {
          run.scenarios[id] = { name: p.name, feature: features.get(p.uri) ?? p.uri, status: 'queued', attempts: 0 };
          broadcast({ type: 'scenario', id, ...run.scenarios[id] });
        }
      }
      else if (m.testCaseStarted) {
        const pickleId = tc.get(m.testCaseStarted.testCaseId)!;
        started.set(m.testCaseStarted.id, { pickleId, at: m.testCaseStarted.timestamp.seconds * 1000 + m.testCaseStarted.timestamp.nanos / 1e6, worst: 'PASSED' });
        const s = run.scenarios[pickleId];
        if (s) { s.status = 'running'; s.attempts++; broadcast({ type: 'scenario', id: pickleId, ...s }); }
      } else if (m.testStepFinished) {
        const st = started.get(m.testStepFinished.testCaseStartedId);
        const status = m.testStepFinished.testStepResult.status as string;
        if (st && (rank[status] ?? 0) > (rank[st.worst] ?? 0)) st.worst = status;
      } else if (m.testCaseFinished) {
        const st = started.get(m.testCaseFinished.testCaseStartedId);
        const s = st && run.scenarios[st.pickleId];
        if (st && s) {
          const end = m.testCaseFinished.timestamp.seconds * 1000 + m.testCaseFinished.timestamp.nanos / 1e6;
          s.ms = Math.round(end - st.at);
          s.status = m.testCaseFinished.willBeRetried ? 'running' : st.worst === 'PASSED' ? 'passed' : st.worst === 'SKIPPED' ? 'skipped' : 'failed';
          broadcast({ type: 'scenario', id: st.pickleId, ...s });
        }
      }
    }
  };
}

function startRun(opts: RunOptions): RunState {
  if (current) throw new Error('A run is already in progress');
  const id = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const dir = join(RUNS_DIR, id);
  mkdirSync(dir, { recursive: true });

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    REPORT_DIR: rel(dir),
    BASE_URL,
    HEADED: opts.headed ? '1' : '0',
    PARALLEL: String(opts.headed ? 0 : Math.max(0, Math.min(4, opts.workers ?? 2))),
    RETRY: String(Math.max(0, Math.min(3, opts.retry ?? 1))),
    BUGS: (opts.bugs ?? []).filter((b) => b in BUGS).join(','),
    VIEWPORT: opts.mobile ? 'mobile' : '',
    LEARN: '0',
    FORCE_COLOR: '0',
  };

  let args: string[];
  let command: string;
  if (opts.kind === 'bug-hunt') {
    args = ['--import', 'tsx', join(ROOT, 'scripts', 'bug-hunt.ts')];
    command = 'npm run bug-hunt';
  } else {
    args = [CUCUMBER];
    if (opts.tags?.trim()) args.push('--tags', opts.tags.trim());
    if (opts.names?.length) {
      const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      args.push('--name', `^(${opts.names.map(esc).join('|')})$`);
    }
    // Readable command line: the --name regex can be huge, so summarise it.
    const shown = args.slice(1).map((a, i, all) =>
      all[i - 1] === '--name' ? `"<${opts.names!.length} selected scenarios>"` : /\s/.test(a) ? `"${a}"` : a);
    command = ['cucumber-js', ...shown].join(' ');
  }

  const child = spawn(process.execPath, args, { cwd: ROOT, env });
  const run: RunState = { id, kind: opts.kind, options: opts, command, startedAt: new Date().toISOString(), state: 'running', scenarios: {}, log: [] };
  current = { run, child, clients: new Set() };
  pushLog(`$ ${command}${env.BUGS ? `   (BUGS=${env.BUGS})` : ''}${opts.headed ? '   (headed + HUD)' : ''}`);

  if (opts.kind === 'suite') {
    current.poll = followMessages(join(dir, 'messages.ndjson'));
    current.timer = setInterval(current.poll, 250);
  }
  child.stdout.on('data', (d) => pushLog(d.toString()));
  child.stderr.on('data', (d) => pushLog(d.toString()));
  child.on('close', (code) => {
    if (!current) return;
    const { timer, poll } = current;
    if (timer) clearInterval(timer);
    poll?.(); // final drain of the message stream
    run.finishedAt = new Date().toISOString();
    run.exitCode = code;
    if (run.state === 'running') run.state = 'finished';
    for (const s of Object.values(run.scenarios)) if (s.status === 'queued' || s.status === 'running') s.status = 'skipped';
    const summary = summarize(run);
    const hasReport = existsSync(join(dir, 'cucumber-report.html'));
    const entry = { id, kind: run.kind, command, options: opts, startedAt: run.startedAt, finishedAt: run.finishedAt, state: run.state, exitCode: code, summary, report: hasReport ? `/reports/runs/${id}/cucumber-report.html` : null };
    writeFileSync(HISTORY, JSON.stringify([entry, ...history()].slice(0, 50), null, 2));
    writeFileSync(join(dir, 'console-run.json'), JSON.stringify(run, null, 2));
    finished.set(id, run);
    broadcast({ type: 'done', run: entry });
    for (const c of current.clients) c.end();
    current = null;
  });
  return run;
}

function stopRun() {
  if (!current) return false;
  current.run.state = 'stopped';
  pushLog('⏹ Stop requested — ending the run and its browsers');
  const pid = current.child.pid;
  if (pid && process.platform === 'win32') spawn('taskkill', ['/pid', String(pid), '/T', '/F']);
  else current.child.kill('SIGTERM');
  return true;
}

// ── PayDemo server (start it from the console if it's not running) ───────
let appServer: ChildProcess | null = null;
async function appUp(): Promise<boolean> {
  try { return (await fetch(BASE_URL, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
}

// ── HTTP ─────────────────────────────────────────────────────────────────
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ndjson': 'application/x-ndjson', '.md': 'text/markdown; charset=utf-8',
};

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function serveFile(res: ServerResponse, base: string, rel: string) {
  const file = normalize(join(base, rel));
  if (!file.startsWith(base) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  let data = '';
  for await (const chunk of req) data += chunk;
  return data ? JSON.parse(data) : {};
}

let catalogCache: Feature[] | null = null;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
    const path = url.pathname;

    if (path === '/' || path === '/index.html') return serveFile(res, join(ROOT, 'console', 'public'), 'index.html');
    if (path.startsWith('/reports/')) return serveFile(res, REPORTS, decodeURIComponent(path.slice('/reports/'.length)));
    if (path.startsWith('/quality/')) return serveFile(res, SITE, decodeURIComponent(path.slice('/quality/'.length)) || 'index.html');
    if (path === '/quality') { res.writeHead(302, { location: '/quality/' }); return res.end(); }

    if (path === '/api/catalog' && req.method === 'GET') {
      if (!catalogCache || url.searchParams.has('refresh')) catalogCache = await listScenarios();
      return sendJson(res, 200, { features: catalogCache, bugs: BUGS, baseUrl: BASE_URL });
    }
    if (path === '/api/status' && req.method === 'GET') {
      return sendJson(res, 200, {
        app: { url: BASE_URL, up: await appUp(), built: existsSync(join(APP_DIST, 'index.html')) },
        dashboard: existsSync(join(SITE, 'index.html')),
        run: current ? { id: current.run.id, kind: current.run.kind, startedAt: current.run.startedAt } : null,
      });
    }
    if (path === '/api/app/start' && req.method === 'POST') {
      if (await appUp()) return sendJson(res, 200, { up: true });
      if (!existsSync(join(APP_DIST, 'index.html'))) return sendJson(res, 409, { error: 'PayDemo is not built — run `npx expo export --platform web` in app/' });
      const serveBin = join(dirname(require.resolve('serve/package.json')), 'build', 'main.js');
      appServer = spawn(process.execPath, [serveBin, '-s', APP_DIST, '-l', new URL(BASE_URL).port || '8081', '--no-clipboard'], { cwd: ROOT, stdio: 'ignore' });
      for (let i = 0; i < 30 && !(await appUp()); i++) await new Promise((r) => setTimeout(r, 300));
      return sendJson(res, 200, { up: await appUp() });
    }
    if (path === '/api/runs' && req.method === 'GET') return sendJson(res, 200, history());
    if (path === '/api/runs' && req.method === 'POST') {
      if (!(await appUp())) return sendJson(res, 409, { error: `PayDemo isn't reachable at ${BASE_URL} — start it first` });
      try {
        const run = startRun((await body(req)) as unknown as RunOptions);
        return sendJson(res, 201, { id: run.id });
      } catch (e) { return sendJson(res, 409, { error: (e as Error).message }); }
    }
    const stop = path.match(/^\/api\/runs\/([\w]+)\/stop$/);
    if (stop && req.method === 'POST') return sendJson(res, 200, { stopped: current?.run.id === stop[1] && stopRun() });

    const events = path.match(/^\/api\/runs\/([\w]+)\/events$/);
    if (events) {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      const id = events[1];
      const live = current?.run.id === id ? current : null;
      const snapshot = live?.run ?? finished.get(id);
      if (snapshot) res.write(`data: ${JSON.stringify({ type: 'snapshot', run: { ...snapshot, summary: summarize(snapshot) } })}\n\n`);
      if (!live) return res.end();
      live.clients.add(res);
      req.on('close', () => live.clients.delete(res));
      return;
    }

    res.writeHead(404); res.end('Not found');
  } catch (e) {
    sendJson(res, 500, { error: (e as Error).message });
  }
});

server.listen(PORT, () => {
  console.log(`🧪 QA Agent Lab — Test Runner Console on http://localhost:${PORT}`);
  console.log(`   PayDemo expected at ${BASE_URL}`);
});

const shutdown = () => { stopRun(); appServer?.kill(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
