import { After, AfterAll, Before, BeforeAll, setDefaultTimeout, Status } from '@cucumber/cucumber';
import { chromium, devices, type Browser } from '@playwright/test';
import { PayDemo } from '../app/PayDemo';
import { env } from './env';
import type { PayDemoWorld } from './world';

setDefaultTimeout(30_000);

let browser: Browser;

BeforeAll(async () => {
  browser = await chromium.launch({ headless: !env.headed, slowMo: env.slowMo });
});

Before(async function (this: PayDemoWorld) {
  this.context = await browser.newContext(
    env.mobileViewport ? { ...devices['Pixel 7'] } : { viewport: { width: 1280, height: 860 } },
  );
  this.context.setDefaultTimeout(env.expectTimeout);
  this.page = await this.context.newPage();
  this.page.on('pageerror', (err) => this.consoleErrors.push(err.message));
  this.page.on('console', (msg) => {
    if (msg.type() === 'error') this.consoleErrors.push(msg.text());
  });
  this.app = new PayDemo(this.page, env.baseUrl, env.bugs);
});

After(async function (this: PayDemoWorld, { result }) {
  if (result?.status === Status.FAILED && this.page) {
    const shot = await this.page.screenshot({ fullPage: true });
    this.attach(shot, 'image/png');
    this.attach(`URL at failure: ${this.page.url()}`, 'text/plain');
  }
  if (this.consoleErrors.length) {
    this.attach(`Console errors:\n${this.consoleErrors.join('\n')}`, 'text/plain');
  }
  await this.context?.close();
});

AfterAll(async () => {
  await browser?.close();
});
