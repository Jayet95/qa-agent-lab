/**
 * Discovery: point the dynamic DOM reader at any form and see how it would
 * resolve every field — without submitting anything. The first step when
 * onboarding a new market or flow.
 *
 *   npm run discover -- --market fr
 *   npm run discover -- --url "http://localhost:8081/signup?market=us&drift=form" --flow signup-us
 */
import { chromium } from '@playwright/test';
import { LearningCatalog } from '../src/dynamic/catalog';
import { DynamicForm } from '../src/dynamic/DynamicForm';
import { writeArtifacts } from '../src/dynamic/report';
import { env } from '../src/support/env';

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

(async () => {
  const market = arg('market') ?? 'us';
  const url = arg('url') ?? `${env.baseUrl}/signup?market=${market}`;
  const flow = arg('flow') ?? `discover-${market}`;

  const browser = await chromium.launch({ headless: !env.headed });
  const page = await browser.newPage();
  await page.goto(url);
  const run = await new DynamicForm(page, new LearningCatalog(), market, flow).inspect();
  await browser.close();

  const { markdown } = writeArtifacts(run);
  console.log(markdown);

  const weak = run.fields.filter((f) => f.resolution.source === 'unresolved' || f.resolution.source === 'type');
  if (weak.length) {
    console.log(`\n⚠ ${weak.length} field(s) need attention (see .claude/skills/onboard-flow/SKILL.md):`);
    for (const f of weak) console.log(`  - "${f.label || '(no label)'}" [${f.descriptor.kind}] → ${f.resolution.key ?? 'unresolved'} (${f.resolution.reason})`);
    process.exitCode = 1;
  } else {
    console.log('\n✓ Every field resolved by catalog/fuzzy/semantic — ready for a thin test.');
  }
})();
