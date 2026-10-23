import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import type { FieldDescriptor } from './types';

// Browser-side code lives in plain JS and is injected as text — see the
// header of browser/read-form.js for why.
const READ_FORM = readFileSync(join(__dirname, 'browser', 'read-form.js'), 'utf8')
  .replace(/^\s*\/\/.*$/gm, '')
  .trim();

/**
 * Reads the live DOM and returns a descriptor per form control — no
 * hand-written selectors. Each control is stamped with `data-dyn-id` so the
 * filler can address it for the rest of the run.
 */
export async function readForm(page: Page): Promise<FieldDescriptor[]> {
  return page.evaluate(`(${READ_FORM})()`) as Promise<FieldDescriptor[]>;
}

/** The form's primary action: the last visible button on the screen. */
export async function findSubmit(page: Page) {
  const buttons = page.locator('button:visible, [role=button]:visible');
  const count = await buttons.count();
  return count ? buttons.nth(count - 1) : null;
}
