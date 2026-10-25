import { Given, Then, When, type DataTable } from '@cucumber/cucumber';
import { DynamicForm } from '../dynamic/DynamicForm';
import { hasDrift } from '../dynamic/drift';
import { writeArtifacts, type FormRunResult } from '../dynamic/report';
import { workerCatalog } from '../dynamic/session';
import { expect } from '../support/expect';
import type { PayDemoWorld } from '../support/world';

// Thin on purpose: a new market is a new Examples row, not new code.

const runs = (w: PayDemoWorld) => ((w.data.runs ??= []) as FormRunResult[]);
const lastRun = (w: PayDemoWorld) => {
  const r = runs(w);
  expect(r.length, 'the reader should have run').toBeGreaterThan(0);
  return r[r.length - 1];
};

async function record(w: PayDemoWorld, run: FormRunResult) {
  runs(w).push(run);
  const { markdown } = writeArtifacts(run);
  w.attach(markdown, 'text/markdown');
}

Given('I open sign-up for the {string} market', async function (this: PayDemoWorld, market: string) {
  this.data.market = market;
  await this.app.open(`/signup?market=${market}`);
});

Given('the {string} sign-up form has changed in a new release', async function (this: PayDemoWorld, market: string) {
  this.data.market = market;
  this.data.variant = 'changed';
  await this.app.open(`/signup?market=${market}`, undefined, { drift: 'form' });
});

When('the dynamic DOM reader completes the form', async function (this: PayDemoWorld) {
  await record(this, await new DynamicForm(this.page, workerCatalog, this.data.market as string).run());
});

When(/^the dynamic DOM reader inspects the form( again)?$/, async function (this: PayDemoWorld, again?: string) {
  const run = await new DynamicForm(this.page, workerCatalog, this.data.market as string).inspect();
  // Inspection runs get their own report names so they never overwrite a market's main report.
  run.variant = [this.data.variant as string | undefined, again ? 'pass-2' : 'inspect'].filter(Boolean).join('-');
  await record(this, run);
});

Then('registration is accepted', async function (this: PayDemoWorld) {
  const run = lastRun(this);
  expect(run.validationErrors, 'the form should accept the generated data').toEqual([]);
  expect(run.outcome).toBe('submitted');
  await expect(this.app.verify.submit, 'should continue to identity verification').toBeVisible();
});

Then('every field was resolved', async function (this: PayDemoWorld) {
  const unresolved = lastRun(this).fields.filter((f) => f.resolution.source === 'unresolved').map((f) => f.label);
  expect(unresolved, 'fields no resolver layer recognised').toEqual([]);
});

Then('no form drift is detected', async function (this: PayDemoWorld) {
  const { drift } = lastRun(this);
  expect(drift.hasBaseline, `no baseline for ${drift.flow} — run with UPDATE_BASELINE=1`).toBe(true);
  expect(hasDrift(drift), JSON.stringify(drift)).toBe(false);
});

Then('every field is resolved from the catalog on the second pass', async function (this: PayDemoWorld) {
  const second = lastRun(this);
  const notFromCatalog = second.fields.filter((f) => f.resolution.source !== 'catalog').map((f) => `${f.label} (${f.resolution.source})`);
  expect(notFromCatalog).toEqual([]);
});

Then('drift is reported with these new fields:', async function (this: PayDemoWorld, table: DataTable) {
  const added = lastRun(this).drift.added.map((a) => a.signature).sort();
  expect(added).toEqual(table.raw().map(([s]) => s.trim()).sort());
});

Then('drift is reported with these removed fields:', async function (this: PayDemoWorld, table: DataTable) {
  const removed = lastRun(this).drift.removed.map((r) => r.signature).sort();
  expect(removed).toEqual(table.raw().map(([s]) => s.trim()).sort());
});
