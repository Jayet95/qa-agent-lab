import { After, AfterAll, Before, BeforeAll, BeforeStep, setDefaultTimeout, Status } from '@cucumber/cucumber';
import { chromium, devices, type Browser } from '@playwright/test';
import { PayDemo } from '../app/PayDemo';
import { env } from './env';
import { Hud } from './hud/Hud';
import type { PayDemoWorld } from './world';

setDefaultTimeout(30_000);

let browser: Browser;
const hud = new Hud(env.hud);

BeforeAll(async () => {
  browser = await chromium.launch({ headless: !env.headed, slowMo: env.slowMo });
});

Before(async function (this: PayDemoWorld, { pickle }) {
  if (hud.state.stopped) return 'skipped';
  this.context = await browser.newContext(
    env.mobileViewport ? { ...devices['Pixel 7'] } : { viewport: { width: 1280, height: 860 } },
  );
  this.context.setDefaultTimeout(env.expectTimeout);
  await hud.attach(this.context);
  this.page = await this.context.newPage();
  this.page.on('pageerror', (err) => this.consoleErrors.push(err.message));
  this.page.on('console', (msg) => {
    if (msg.type() === 'error') this.consoleErrors.push(msg.text());
  });
  this.app = new PayDemo(this.page, env.baseUrl, env.bugs);
  hud.state.scenario = pickle.name;
  return undefined;
});

// No timeout: a paused run must not fail the step it's paused before.
BeforeStep({ timeout: -1 }, async function (this: PayDemoWorld, { pickle, pickleStep }) {
  if (!this.page) return;
  const index = pickle.steps.findIndex((s) => s.id === pickleStep.id) + 1;
  await hud.render(this.page, { step: pickleStep.text, index, total: pickle.steps.length });
  await hud.gate(this.page);
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
  if (this.app?.healing.length) {
    // The run passed thanks to smart find — say which selectors need fixing.
    this.attach(JSON.stringify({ healed: this.app.healing }, null, 2), 'application/json');
  }
  if (result?.status === Status.PASSED) hud.state.passed++;
  else if (result?.status === Status.FAILED) hud.state.failed++;
  await this.context?.close();
});

AfterAll(async () => {
  await browser?.close();
});
