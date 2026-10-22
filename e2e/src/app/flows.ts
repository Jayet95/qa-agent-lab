import { expect } from '../support/expect';
import type { DocumentType, SendPage, SignUpPage, VerifyPage, WalletPage, WelcomePage } from './pages';

export interface NewCustomer {
  name: string;
  email: string;
  password: string;
}

/** Business flows: multi-screen journeys composed from page objects. */
export class OnboardingFlow {
  constructor(
    private readonly welcome: WelcomePage,
    private readonly signUpPage: SignUpPage,
    private readonly verifyPage: VerifyPage,
  ) {}

  async startSignUp() {
    await this.welcome.getStarted.click();
    await expect(this.signUpPage.submit).toBeVisible();
  }

  async submitSignUp(customer: NewCustomer) {
    await this.signUpPage.fill(customer);
    await this.signUpPage.submit.click();
  }

  async signUp(customer: NewCustomer) {
    await this.startSignUp();
    await this.submitSignUp(customer);
    await expect(this.verifyPage.submit, 'should reach identity verification').toBeVisible();
  }

  /** Chooses, uploads and scans a document, then waits for the OCR review form. */
  async scanDocument(type: DocumentType) {
    await this.verifyPage.document(type).click();
    await this.verifyPage.upload.click();
    await expect(this.verifyPage.uploadStatus).toBeVisible();
    await this.verifyPage.submit.click();
    await expect(this.verifyPage.review, 'OCR should produce details to review').toBeVisible();
  }

  async confirmDetails() {
    await this.verifyPage.confirm.click();
  }

  /** Scan + accept the details as read. */
  async submitDocument(type: DocumentType) {
    await this.scanDocument(type);
    await this.confirmDetails();
  }

  /** Waits on the real verified state — no fixed sleeps. */
  async verifyIdentity(type: DocumentType) {
    await this.submitDocument(type);
    await expect(this.verifyPage.verified, 'identity verification should complete').toBeVisible();
    await this.verifyPage.continue.click();
  }
}

export class PaymentFlow {
  constructor(
    private readonly wallet: WalletPage,
    private readonly sendPage: SendPage,
  ) {}

  async attemptSend(to: string, amount: string) {
    await this.wallet.send.click();
    await this.sendPage.recipient.fill(to);
    await this.sendPage.amount.fill(amount);
    await this.sendPage.submit.click();
  }

  /** Sends a payment and waits until we're back on the wallet. */
  async send(to: string, amount: string) {
    await this.attemptSend(to, amount);
    await expect(this.wallet.balance, 'should return to the wallet after paying').toBeVisible();
  }
}
