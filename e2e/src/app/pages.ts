import type { Locator, Page } from '@playwright/test';
import { healable, type HealingEvent } from '../dynamic/smartFind';

/**
 * Page objects: the only place that knows about selectors.
 * PayDemo exposes React Native `testID`s, which render as `data-testid` on
 * web — the same IDs Detox will use on mobile.
 */
abstract class Screen {
  constructor(
    protected readonly page: Page,
    protected readonly healing: HealingEvent[] = [],
  ) {}
  protected id(testId: string): Locator {
    return this.page.getByTestId(testId);
  }
  /** testID first; if it has vanished, heal via smart find and log it. */
  protected heal(testId: string, description: string): Promise<Locator> {
    return healable(this.page, testId, description, this.healing);
  }
}

export class WelcomePage extends Screen {
  readonly getStarted = this.id('welcome-get-started');
  getStartedHealed = () => this.heal('welcome-get-started', 'Get started button');
}

export class SignUpPage extends Screen {
  readonly name = this.id('signup-name');
  readonly email = this.id('signup-email');
  readonly password = this.id('signup-password');
  readonly submit = this.id('signup-submit');
  submitHealed = () => this.heal('signup-submit', 'Create account button');

  error(field: 'name' | 'email' | 'password'): Locator {
    return this.id(`signup-${field}-error`);
  }

  async fill(details: { name: string; email: string; password: string }) {
    await this.name.fill(details.name);
    await this.email.fill(details.email);
    await this.password.fill(details.password);
  }
}

export type DocumentType = 'passport' | 'id-card';

/** Review-form fields, keyed by how they're named in Gherkin. */
export const KYC_FIELDS = {
  'full name': 'name',
  'date of birth': 'dob',
  nationality: 'nationality',
  'document number': 'document-number',
  'expiry date': 'expiry',
} as const;
export type KycFieldName = keyof typeof KYC_FIELDS;

export class VerifyPage extends Screen {
  readonly upload = this.id('kyc-upload');
  readonly uploadStatus = this.id('kyc-upload-status');
  /** "Scan document" — starts OCR. */
  readonly submit = this.id('kyc-submit');
  readonly reading = this.id('kyc-status-reading');
  readonly review = this.id('kyc-review');
  readonly confirm = this.id('kyc-confirm');
  readonly pending = this.id('kyc-status-pending');
  readonly verified = this.id('kyc-status-verified');
  readonly continue = this.id('kyc-continue');

  document(type: DocumentType): Locator {
    return this.id(`kyc-doc-${type}`);
  }

  field(name: KycFieldName): Locator {
    return this.id(`kyc-field-${KYC_FIELDS[name]}`);
  }

  fieldError(name: KycFieldName): Locator {
    return this.id(`kyc-field-${KYC_FIELDS[name]}-error`);
  }

  confidence(name: KycFieldName): Locator {
    return this.id(`kyc-confidence-${KYC_FIELDS[name]}`);
  }
}

export class WalletPage extends Screen {
  readonly greeting = this.id('wallet-greeting');
  readonly balance = this.id('wallet-balance');
  readonly verification = this.id('wallet-verification');
  readonly remainingLimit = this.id('wallet-limit');
  readonly send = this.id('wallet-send');
  readonly deposit = this.id('wallet-deposit');
  readonly empty = this.id('wallet-empty');

  transaction(index: number): Locator {
    return this.id(`wallet-tx-${index}`);
  }
}

export class SendPage extends Screen {
  readonly recipient = this.id('send-recipient');
  readonly amount = this.id('send-amount');
  readonly submit = this.id('send-submit');
  readonly error = this.id('send-error');
  /** Inline message under the amount field, shown while typing. */
  readonly amountError = this.id('send-amount-error');
  readonly available = this.id('send-available');
  readonly max = this.id('send-max');
}

export class DepositPage extends Screen {
  readonly amount = this.id('deposit-amount');
  readonly submit = this.id('deposit-submit');
  readonly error = this.id('deposit-error');
  readonly amountError = this.id('deposit-amount-error');

  quick(amount: number): Locator {
    return this.id(`deposit-quick-${amount}`);
  }
}

export class Chrome extends Screen {
  readonly toast = this.id('toast');
  readonly bugBanner = this.id('bug-banner');
}
