import { Given, Then } from '@cucumber/cucumber';
import { expect } from '../support/expect';
import type { Money } from '../support/parameters';
import type { PayDemoWorld } from '../support/world';

// Steps stay thin: translate Gherkin into flows/page objects + assertions.

Given('I am a new visitor', async function (this: PayDemoWorld) {
  await this.app.open('/');
});

Given('I am a verified customer with {money}', async function (this: PayDemoWorld, money: Money) {
  await this.app.open('/wallet', 'verified-user');
  await expect(this.app.wallet.balance).toHaveText(money.formatted);
});

Given('I am a customer who has not verified their identity', async function (this: PayDemoWorld) {
  await this.app.open('/wallet', 'unverified-user');
  await expect(this.app.wallet.verification).toContainText('Not verified');
});

Then(/^my balance is (?:still )?(\$[\d,.]+)$/, async function (this: PayDemoWorld, amount: string) {
  await expect(this.app.wallet.balance).toHaveText(amount);
});

Then('the welcome screen is shown', async function (this: PayDemoWorld) {
  await expect(this.app.welcome.getStarted).toBeVisible();
});

Then('no errors were logged in the browser', async function (this: PayDemoWorld) {
  expect(this.consoleErrors, 'browser console errors').toEqual([]);
});

Then('bug mode is off', async function (this: PayDemoWorld) {
  await expect(this.app.chrome.bugBanner).toHaveCount(0);
});
