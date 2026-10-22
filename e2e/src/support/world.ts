import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { BrowserContext, Page } from '@playwright/test';
import { PayDemo } from '../app/PayDemo';

/**
 * Per-scenario state. Steps talk to `this.app` (flows + page objects) and
 * keep scenario data in `this.data` — never in module-level globals, so
 * scenarios stay independent and can run in parallel.
 */
export class PayDemoWorld extends World {
  context!: BrowserContext;
  page!: Page;
  app!: PayDemo;
  consoleErrors: string[] = [];
  data: Record<string, unknown> = {};

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(PayDemoWorld);
