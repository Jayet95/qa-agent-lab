import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import type { LearningCatalog } from './catalog';
import { findSubmit, readForm } from './domReader';
import { detectDrift } from './drift';
import { generate, mask } from './generators';
import { DYNAMIC_DIR, type FormRunResult, type JourneyStep } from './report';
import { resolveField } from './resolver';
import { displayLabel, type FieldDescriptor, type FieldOutcome } from './types';

/**
 * Drives any registration-style form end to end without hand-written
 * selectors: read the live DOM → resolve every field → generate valid data
 * → fill → submit → report. A new market needs a thin test, not new code.
 */
export class DynamicForm {
  private readonly journey: JourneyStep[] = [];

  constructor(
    private readonly page: Page,
    private readonly catalog: LearningCatalog,
    private readonly market: string,
    private readonly flow = `signup-${market}`,
  ) {}

  private async log(step: string, detail?: string, shot = false) {
    const entry: JourneyStep = { at: new Date().toISOString(), step, detail };
    if (shot) {
      mkdirSync(join(DYNAMIC_DIR, 'shots'), { recursive: true });
      entry.screenshot = join(DYNAMIC_DIR, 'shots', `${this.flow}-${this.journey.length}.png`);
      await this.page.screenshot({ path: entry.screenshot, fullPage: true });
    }
    this.journey.push(entry);
  }

  async read(): Promise<FieldDescriptor[]> {
    await this.page.locator('input, [role=radiogroup]').first().waitFor();
    const fields = await readForm(this.page);
    await this.log('read', `${fields.length} controls found`);
    return fields;
  }

  resolve(fields: FieldDescriptor[]): FieldOutcome[] {
    const outcomes = fields.map((d) => {
      const { text, from } = displayLabel(d);
      return {
        descriptor: d,
        label: text,
        labelFrom: from,
        resolution: resolveField(d, this.catalog, this.market),
        value: null,
        suggestedSelector: suggestSelector(d, text, from),
        error: null,
      } satisfies FieldOutcome;
    });
    void this.log('resolve', outcomes.map((o) => `${o.label}→${o.resolution.key}(${o.resolution.source})`).join(', '));
    return outcomes;
  }

  async fill(outcomes: FieldOutcome[]) {
    const suffix = `${Date.now().toString(36)}${process.pid}`;
    for (const o of outcomes) {
      if (!o.resolution.key) continue;
      const d = o.descriptor;
      const value = generate(o.resolution.key, d, { market: this.market, uniqueSuffix: suffix });
      const target = this.page.locator(`[data-dyn-id="${d.dynId}"]`);
      if (d.kind === 'choice') {
        await target.getByRole('radio', { name: value, exact: true }).click();
      } else {
        await target.fill(value);
      }
      o.value = mask(o.resolution.key, value);
    }
    await this.log('fill', `${outcomes.filter((o) => o.value !== null).length} fields filled`, true);
  }

  async submit(): Promise<{ outcome: FormRunResult['outcome']; errors: string[] }> {
    const button = await findSubmit(this.page);
    if (!button) return { outcome: 'not-submitted', errors: ['no submit button found'] };
    const label = (await button.getAttribute('aria-label')) ?? (await button.innerText());
    await button.click();
    // Whichever happens first: we leave the form, or validation errors appear.
    const alerts = this.page.getByRole('alert');
    let didLeave = false;
    for (const end = Date.now() + 6000; Date.now() < end; await this.page.waitForTimeout(100)) {
      if (!new URL(this.page.url()).pathname.endsWith('/signup')) { didLeave = true; break; }
      if (await alerts.count()) break;
    }
    const errors = didLeave ? [] : await alerts.allInnerTexts();
    await this.log('submit', `clicked "${label}" → ${didLeave ? 'left the form' : `${errors.length} error(s)`}`, true);
    return { outcome: didLeave ? 'submitted' : 'rejected', errors };
  }

  /** The whole journey. */
  async run(): Promise<FormRunResult> {
    const url = this.page.url();
    await this.log('open', url);
    const fields = this.resolve(await this.read());
    await this.fill(fields);
    const { outcome, errors } = await this.submit();
    return { flow: this.flow, market: this.market, url, outcome, fields, validationErrors: errors, drift: detectDrift(this.flow, fields), journey: this.journey };
  }

  /** Read + resolve only — for discovery and drift checks. */
  async inspect(): Promise<FormRunResult> {
    const url = this.page.url();
    const fields = this.resolve(await this.read());
    return { flow: this.flow, market: this.market, url, outcome: 'not-submitted', fields, validationErrors: [], drift: detectDrift(this.flow, fields), journey: this.journey };
  }
}

/** A selector a human could commit, preferring the most stable hook. */
function suggestSelector(d: FieldDescriptor, label: string, from: string): string {
  if (d.testId) return `getByTestId('${d.testId}')`;
  if (d.kind === 'choice' && label) return `getByText('${label}').locator('xpath=following::*[@role="radiogroup"][1]')`;
  if (from === 'aria') return `getByLabel('${label}')`;
  if (from === 'visual') return `getByText('${label}', { exact: true }).locator('xpath=following::input[1]')`;
  if (from === 'placeholder') return `getByPlaceholder('${label}')`;
  return `locator('${d.tag}') /* no stable hook — add a testID */`;
}
