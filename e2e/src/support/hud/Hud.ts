import { join } from 'node:path';
import type { BrowserContext, Page } from '@playwright/test';

export interface HudState {
  scenario: string;
  step: string;
  index: number;
  total: number;
  passed: number;
  failed: number;
  paused: boolean;
  stopped: boolean;
}

type Action = 'sync' | 'toggle' | 'step' | 'inspect' | 'stop';

const HUD_SCRIPT = join(__dirname, 'hud.js');

/**
 * Node side of the testing HUD. The overlay in the browser calls back via
 * an exposed binding; the runner checks `gate()` before every step, so a
 * pause takes effect at the next step boundary. "Inspect" opens the
 * Playwright inspector, which can step through individual actions.
 */
export class Hud {
  readonly state: HudState = { scenario: '', step: '', index: 0, total: 0, passed: 0, failed: 0, paused: false, stopped: false };
  private stepOnce = false;
  private inspect = false;

  constructor(readonly enabled: boolean) {}

  handle(action: Action): HudState {
    switch (action) {
      case 'toggle': this.state.paused = !this.state.paused; break;
      case 'step': this.state.paused = true; this.stepOnce = true; break;
      case 'inspect': this.inspect = true; break;
      case 'stop': this.state.stopped = true; this.state.paused = false; break;
    }
    return { ...this.state };
  }

  async attach(context: BrowserContext) {
    if (!this.enabled) return;
    await context.exposeBinding('__qaHud', (_source, action: Action) => this.handle(action));
    await context.addInitScript({ path: HUD_SCRIPT });
  }

  async render(page: Page, patch: Partial<HudState> = {}) {
    Object.assign(this.state, patch);
    if (!this.enabled || page.isClosed()) return;
    // A string (not a function) — see dynamic/browser/read-form.js for why.
    await page.evaluate(`window.__qaHudRender && window.__qaHudRender(${JSON.stringify(this.state)})`).catch(() => {});
  }

  /** Called before each step: waits while paused; throws if stopped. */
  async gate(page: Page) {
    if (!this.enabled) return;
    for (;;) {
      if (this.state.stopped) throw new Error('⏹ Run stopped from the HUD');
      if (this.inspect) {
        this.inspect = false;
        await page.pause(); // Playwright inspector — resume there to continue
      }
      if (this.stepOnce) { this.stepOnce = false; return; }
      if (!this.state.paused) return;
      await new Promise((r) => setTimeout(r, 120));
    }
  }
}
