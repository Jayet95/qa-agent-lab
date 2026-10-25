import { Given, Then, When, type DataTable } from '@cucumber/cucumber';
import { smartFind, type FindResult } from '../dynamic/smartFind';
import { expect } from '../support/expect';
import type { PayDemoWorld } from '../support/world';

const found = (w: PayDemoWorld) => ((w.data.smartFind ??= {}) as Record<string, FindResult>);

Given('the app ships with renamed test IDs', function (this: PayDemoWorld) {
  this.app.drift = ['testids'];
});

When('I use smart find on {string}', async function (this: PayDemoWorld, description: string) {
  const result = await smartFind(this.page, description);
  await expect(result.locator, `smart find result for "${description}"`).toBeVisible();
  // Interact, so we know the element is real — click buttons, focus fields.
  if (/button|link$/i.test(description)) await result.locator.click();
  else await result.locator.focus();
  found(this)[description] = result;
});

Then('smart find used these strategies:', function (this: PayDemoWorld, table: DataTable) {
  const actual = table.hashes().map(({ description }) => ({ description, strategy: found(this)[description]?.strategy }));
  expect(actual).toEqual(table.hashes());
});

Then('{int} locators were healed by smart find', function (this: PayDemoWorld, n: number) {
  expect(this.app.healing.map((h) => h.testId)).toHaveLength(n);
});

Then('each healed locator suggests a stable replacement selector', function (this: PayDemoWorld) {
  for (const h of this.app.healing) {
    expect(h.suggestedSelector, `replacement for ${h.testId}`).toMatch(/^getBy/);
  }
});
