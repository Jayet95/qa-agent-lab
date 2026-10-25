import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '../support/expect';
import type { Money } from '../support/parameters';
import type { PayDemoWorld } from '../support/world';

Given('I have already sent {money} today', async function (this: PayDemoWorld, money: Money) {
  await this.app.payments.send('earlier@example.com', money.raw);
  await expect(this.app.wallet.transaction(0)).toContainText(money.formatted);
});

When('I send {money} to {string}', async function (this: PayDemoWorld, money: Money, to: string) {
  await this.app.payments.send(to, money.raw);
});

When('I try to send {money} to {string}', async function (this: PayDemoWorld, money: Money, to: string) {
  await this.app.payments.attemptSend(to, money.raw);
});

When('I change the amount to {money}', async function (this: PayDemoWorld, money: Money) {
  await this.app.send.amount.fill(money.raw);
});

Then('the rejection message disappears', async function (this: PayDemoWorld) {
  await expect(this.app.send.error).toHaveCount(0);
});

Then('I see the confirmation {string}', async function (this: PayDemoWorld, message: string) {
  await expect(this.app.chrome.toast).toHaveText(message);
});

Then('my latest transaction is {money} to {string}', async function (this: PayDemoWorld, money: Money, to: string) {
  const tx = this.app.wallet.transaction(0);
  await expect(tx).toContainText(`To ${to}`);
  await expect(tx).toContainText(money.formatted);
});

Then('I have {money} left to send today', async function (this: PayDemoWorld, money: Money) {
  await expect(this.app.wallet.remainingLimit).toHaveText(`${money.formatted} left today`);
});

Then('the payment is rejected with {string}', async function (this: PayDemoWorld, message: string) {
  await expect(this.app.send.error).toHaveText(message);
  await expect(this.app.send.submit, 'should stay on the send screen').toBeVisible();
});

When('I try to send {string} to {string}', async function (this: PayDemoWorld, amount: string, to: string) {
  await this.app.payments.attemptSend(to, amount);
});

When('I open the send screen', async function (this: PayDemoWorld) {
  await this.app.wallet.send.click();
  await expect(this.app.send.amount).toBeVisible();
});

When('I type {string} as the amount', async function (this: PayDemoWorld, amount: string) {
  await this.app.send.amount.fill(amount);
});

When('I choose to send the maximum', async function (this: PayDemoWorld) {
  await this.app.send.max.click();
});

Then('the amount field warns {string}', async function (this: PayDemoWorld, message: string) {
  await expect(this.app.send.amountError).toHaveText(message);
});

Then('the amount field shows no warning', async function (this: PayDemoWorld) {
  await expect(this.app.send.amountError).toHaveCount(0);
});

Then('the amount is {string}', async function (this: PayDemoWorld, value: string) {
  await expect(this.app.send.amount).toHaveValue(value);
});

Then('I am told I can send up to {money} right now', async function (this: PayDemoWorld, money: Money) {
  await expect(this.app.send.available).toHaveText(`You can send up to ${money.formatted} right now.`);
});
