import { Given, Then, When, type DataTable } from '@cucumber/cucumber';
import { KYC_FIELDS, type KycFieldName } from '../app/pages';
import { newCustomer } from '../support/data';
import { expect } from '../support/expect';
import type { PayDemoWorld } from '../support/world';

// Field names as written in Gherkin: "full name", "date of birth", ...
const FIELD = `(${Object.keys(KYC_FIELDS).join('|')})`;

Given('I have signed up as {string}', async function (this: PayDemoWorld, name: string) {
  await this.app.open('/');
  await this.app.onboarding.signUp(newCustomer({ name }));
});

When('I scan my passport', async function (this: PayDemoWorld) {
  await this.app.onboarding.scanDocument('passport');
});

When('I scan my ID card', async function (this: PayDemoWorld) {
  await this.app.onboarding.scanDocument('id-card');
});

When('I confirm the details', async function (this: PayDemoWorld) {
  await this.app.onboarding.confirmDetails();
});

When(
  new RegExp(`^I change the ${FIELD} to "([^"]*)"$`),
  async function (this: PayDemoWorld, field: KycFieldName, value: string) {
    await this.app.verify.field(field).fill(value);
  },
);

Then('I see these details read from my document:', async function (this: PayDemoWorld, table: DataTable) {
  for (const { field, value } of table.hashes() as { field: KycFieldName; value: string }[]) {
    await expect(this.app.verify.field(field), `OCR value for ${field}`).toHaveValue(value);
  }
});

Then('no field is flagged as low confidence', async function (this: PayDemoWorld) {
  for (const field of Object.keys(KYC_FIELDS) as KycFieldName[]) {
    await expect(this.app.verify.confidence(field)).not.toContainText('Low confidence');
  }
});

Then(
  new RegExp(`^the ${FIELD} is flagged as low confidence$`),
  async function (this: PayDemoWorld, field: KycFieldName) {
    await expect(this.app.verify.confidence(field)).toContainText('Low confidence');
  },
);

Then(
  new RegExp(`^I see the ${FIELD} error "([^"]+)"$`),
  async function (this: PayDemoWorld, field: KycFieldName, message: string) {
    await expect(this.app.verify.fieldError(field)).toHaveText(message);
  },
);

Then(
  new RegExp(`^the ${FIELD} error disappears$`),
  async function (this: PayDemoWorld, field: KycFieldName) {
    await expect(this.app.verify.fieldError(field)).toHaveCount(0);
  },
);

Then('my identity is not submitted for verification', async function (this: PayDemoWorld) {
  await expect(this.app.verify.pending).toHaveCount(0);
  await expect(this.app.verify.confirm).toBeVisible();
});
