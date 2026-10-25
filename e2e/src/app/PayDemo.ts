import type { Page } from '@playwright/test';
import type { HealingEvent } from '../dynamic/smartFind';
import { OnboardingFlow, PaymentFlow } from './flows';
import { Chrome, SendPage, SignUpPage, VerifyPage, WalletPage, WelcomePage } from './pages';

export type Seed = 'verified-user' | 'unverified-user';

/** Facade the step definitions use: pages + flows + app-level navigation. */
export class PayDemo {
  readonly welcome: WelcomePage;
  readonly signUp: SignUpPage;
  readonly verify: VerifyPage;
  readonly wallet: WalletPage;
  readonly send: SendPage;
  readonly chrome: Chrome;
  readonly onboarding: OnboardingFlow;
  readonly payments: PaymentFlow;
  /** Locators healed by smart find during this scenario. */
  readonly healing: HealingEvent[] = [];
  /** UI-drift switches applied to every page this scenario opens. */
  drift: string[] = [];

  constructor(
    readonly page: Page,
    private readonly baseUrl: string,
    private readonly bugs: string[],
  ) {
    this.welcome = new WelcomePage(page, this.healing);
    this.signUp = new SignUpPage(page, this.healing);
    this.verify = new VerifyPage(page, this.healing);
    this.wallet = new WalletPage(page, this.healing);
    this.send = new SendPage(page, this.healing);
    this.chrome = new Chrome(page, this.healing);
    this.onboarding = new OnboardingFlow(this.welcome, this.signUp, this.verify);
    this.payments = new PaymentFlow(this.wallet, this.send);
  }

  /**
   * Opens the app. `seed` skips UI set-up for preconditions (like seeding a
   * DB) so each scenario only drives the UI for what it actually tests.
   */
  async open(path = '/', seed?: Seed, extra: Record<string, string> = {}) {
    const url = new URL(path, this.baseUrl);
    if (seed) url.searchParams.set('seed', seed);
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
    if (this.bugs.length) url.searchParams.set('bugs', this.bugs.join(','));
    if (this.drift.length) url.searchParams.set('drift', this.drift.join(','));
    await this.page.goto(url.toString());
  }
}
