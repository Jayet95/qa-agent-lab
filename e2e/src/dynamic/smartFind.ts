import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Locator, Page } from '@playwright/test';

/**
 * Smart find: locate an element from a plain description such as
 * "Create account button" or "Email field", the way a person would —
 * trying the most reliable strategy first and falling back to fuzzy
 * matching on accessible names. Every result says which strategy worked.
 */
const SMART_FIND = readFileSync(join(__dirname, 'browser', 'smart-find.js'), 'utf8')
  .replace(/^\s*\/\/.*$/gm, '')
  .trim();

const ROLE_WORDS: Record<string, string> = {
  button: 'button', link: 'link', field: 'textbox', input: 'textbox', textbox: 'textbox',
  box: 'textbox', checkbox: 'checkbox', radio: 'radio', option: 'radio', tab: 'tab',
};

export type Strategy = 'role' | 'label' | 'placeholder' | 'text' | 'fuzzy';

export interface FindResult {
  locator: Locator;
  strategy: Strategy;
  /** 1 for exact strategies; similarity for fuzzy. */
  score: number;
  /** A selector a human could commit next time. */
  suggestedSelector: string;
}

export const FUZZY_MIN = 0.6;

/** "Create account button" → { name: "Create account", role: "button" }. */
export function parseDescription(description: string): { name: string; role?: string } {
  const words = description.trim().split(/\s+/);
  const last = words[words.length - 1].toLowerCase();
  const role = ROLE_WORDS[last];
  return role && words.length > 1 ? { name: words.slice(0, -1).join(' '), role } : { name: description.trim() };
}

let stamp = 0;

export async function smartFind(page: Page, description: string, timeoutMs = 4000): Promise<FindResult> {
  const { name, role } = parseDescription(description);
  const exact: { strategy: Strategy; locator: Locator; selector: string }[] = [
    ...(role ? [{ strategy: 'role' as const, locator: page.getByRole(role as Parameters<Page['getByRole']>[0], { name }), selector: `getByRole('${role}', { name: '${name}' })` }] : []),
    { strategy: 'label', locator: page.getByLabel(name), selector: `getByLabel('${name}')` },
    { strategy: 'placeholder', locator: page.getByPlaceholder(name), selector: `getByPlaceholder('${name}')` },
    { strategy: 'text', locator: page.getByText(name, { exact: true }), selector: `getByText('${name}', { exact: true })` },
  ];

  const deadline = Date.now() + timeoutMs;
  do {
    for (const s of exact) {
      const visible = s.locator.filter({ visible: true });
      if ((await visible.count()) === 1) {
        return { locator: visible, strategy: s.strategy, score: 1, suggestedSelector: s.selector };
      }
    }
    const id = `s${++stamp}`;
    const hit = (await page.evaluate(`(${SMART_FIND})(${JSON.stringify({ query: name, role: role ?? null, stampId: id })})`)) as
      { score: number; name: string; role: string } | null;
    if (hit && hit.score >= FUZZY_MIN) {
      return {
        locator: page.locator(`[data-smart-id="${id}"]`),
        strategy: 'fuzzy',
        score: hit.score,
        suggestedSelector: hit.role ? `getByRole('${hit.role}', { name: '${hit.name}' })` : `getByText('${hit.name}')`,
      };
    }
    await page.waitForTimeout(150);
  } while (Date.now() < deadline);

  throw new Error(`smartFind: nothing on the page matches "${description}"`);
}

/** A locator that fell back to smart find because its testID disappeared. */
export interface HealingEvent {
  testId: string;
  description: string;
  strategy: Strategy;
  score: number;
  suggestedSelector: string;
  url: string;
  at: string;
}

/**
 * Self-healing: use the testID if it's there; otherwise heal via smart find
 * and record it, so the run passes *and* tells you which selector to fix.
 */
export async function healable(page: Page, testId: string, description: string, log: HealingEvent[]): Promise<Locator> {
  const byId = page.getByTestId(testId);
  try {
    await byId.first().waitFor({ state: 'visible', timeout: 1500 });
    return byId;
  } catch {
    const found = await smartFind(page, description);
    log.push({
      testId,
      description,
      strategy: found.strategy,
      score: found.score,
      suggestedSelector: found.suggestedSelector,
      url: page.url(),
      at: new Date().toISOString(),
    });
    return found.locator;
  }
}
