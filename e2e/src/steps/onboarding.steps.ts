import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '../support/expect';
import { newCustomer } from '../support/data';
import type { PayDemoWorld } from '../support/world';

Given('I have signed up', async function (this: PayDemoWorld) {
  await this.app.open('/');
  await this.app.onboarding.signUp(newCustomer());
});

When('I sign up as {string}', async function (this: PayDemoWorld, name: string) {
  await this.app.onboarding.signUp(newCustomer({ name }));
});

When('I verify my identity with a passport', async function (this: PayDemoWorld) {
  await this.app.onboarding.verifyIdentity('passport');
});

When('I submit my passport for verification', async function (this: PayDemoWorld) {
  await this.app.onboarding.submitDocument('passport');
});

When('I try to sign up with the email {string}', async function (this: PayDemoWorld, email: string) {
  await this.app.onboarding.startSignUp();
  await this.app.onboarding.submitSignUp(newCustomer({ email }));
});

When('I try to sign up with the password {string}', async function (this: PayDemoWorld, password: string) {
  await this.app.onboarding.startSignUp();
  await this.app.onboarding.submitSignUp(newCustomer({ password }));
});

When('I try to sign up without a name', async function (this: PayDemoWorld) {
  await this.app.onboarding.startSignUp();
  await this.app.onboarding.submitSignUp(newCustomer({ name: '' }));
});

Then(
  /^I see the (name|email|password) error "([^"]+)"$/,
  async function (this: PayDemoWorld, field: 'name' | 'email' | 'password', message: string) {
    await expect(this.app.signUp.error(field)).toHaveText(message);
  },
);

When('I correct the email to a valid address', async function (this: PayDemoWorld) {
  await this.app.signUp.email.fill(newCustomer().email);
});

Then(
  /^the (name|email|password) error disappears without resubmitting$/,
  async function (this: PayDemoWorld, field: 'name' | 'email' | 'password') {
    await expect(this.app.signUp.error(field)).toHaveCount(0);
  },
);

Then('I am still on the sign-up form', async function (this: PayDemoWorld) {
  await expect(this.app.signUp.submit).toBeVisible();
  await expect(this.app.verify.submit).toHaveCount(0);
});

Then('I see that verification is in progress', async function (this: PayDemoWorld) {
  await expect(this.app.verify.pending).toBeVisible();
});

Then('verification completes successfully', async function (this: PayDemoWorld) {
  await expect(this.app.verify.verified).toBeVisible();
});

Then('I land on my wallet greeted as {string}', async function (this: PayDemoWorld, firstName: string) {
  await expect(this.app.wallet.greeting).toContainText(`Hi, ${firstName}`);
});

Then('my identity shows as verified', async function (this: PayDemoWorld) {
  await expect(this.app.wallet.verification).toHaveText('✓ Verified');
});
