import { Then, When } from '@cucumber/cucumber';
import { expect } from '../support/expect';
import type { Money } from '../support/parameters';
import type { PayDemoWorld } from '../support/world';

When('I add {money} to my wallet', async function (this: PayDemoWorld, money: Money) {
  await this.app.deposits.deposit(money.raw);
});

When('I try to add {money} to my wallet', async function (this: PayDemoWorld, money: Money) {
  await this.app.deposits.attemptDeposit(money.raw);
});

When('I try to add {string} to my wallet', async function (this: PayDemoWorld, amount: string) {
  await this.app.deposits.attemptDeposit(amount);
});

When('I add the {money} quick amount to my wallet', async function (this: PayDemoWorld, money: Money) {
  await this.app.deposits.open();
  await this.app.depositPage.quick(money.value).click();
  await expect(this.app.depositPage.amount).toHaveValue(String(money.value));
  await this.app.depositPage.submit.click();
  await expect(this.app.wallet.balance).toBeVisible();
});

Then('the deposit is rejected with {string}', async function (this: PayDemoWorld, message: string) {
  await expect(this.app.depositPage.error).toHaveText(message);
  await expect(this.app.depositPage.submit, 'should stay on the deposit screen').toBeVisible();
});

Then('my latest transaction is a deposit of {money}', async function (this: PayDemoWorld, money: Money) {
  const tx = this.app.wallet.transaction(0);
  await expect(tx).toContainText('Added to wallet');
  await expect(tx).toContainText(`+${money.formatted}`);
});
