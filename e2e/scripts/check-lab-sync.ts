/**
 * The planted-bug list lives in three places: the app (source of truth), the
 * Live Lab page, and the lab-run workflow's allowed inputs. Fail CI if they
 * drift apart.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..');
const app = Object.keys(JSON.parse(readFileSync(join(root, 'app/src/lib/bugs.json'), 'utf8'))).sort();

const labSrc = readFileSync(join(root, 'lab/lib/config.js'), 'utf8');
const labBlock = labSrc.slice(labSrc.indexOf('export const BUGS'), labSrc.indexOf('};', labSrc.indexOf('export const BUGS')));
const lab = [...labBlock.matchAll(/'([a-z-]+)':/g)].map((m) => m[1]).sort();

const wf = readFileSync(join(root, '.github/workflows/lab-run.yml'), 'utf8');
const wfOptions = /options: \[none, ([^\]]+)\]/.exec(wf)?.[1].split(',').map((s) => s.trim()).sort() ?? [];

const problems = [
  JSON.stringify(lab) !== JSON.stringify(app) && `lab/lib/config.js BUGS ${JSON.stringify(lab)} ≠ app ${JSON.stringify(app)}`,
  JSON.stringify(wfOptions) !== JSON.stringify(app) && `lab-run.yml bug options ${JSON.stringify(wfOptions)} ≠ app ${JSON.stringify(app)}`,
].filter(Boolean);

if (problems.length) {
  problems.forEach((p) => console.error(`✗ ${p}`));
  process.exit(1);
}
console.log(`✓ Planted-bug list in sync across app, Live Lab and lab-run workflow (${app.length} bugs)`);
