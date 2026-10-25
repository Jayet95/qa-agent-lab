# 🧪 QA Agent Lab

An end-to-end, AI-assisted quality engineering lab, built from scratch by
**Yakov Yahav Eliyahu**. It shows how I design test automation for a
regulated fintech product: BDD that the whole team can read, automation that
adapts to new markets instead of hard-coding selectors, and quality measured
with numbers rather than opinions.

| | |
|---|---|
| **PayDemo** (`app/`) | A small fintech app in **React Native (Expo SDK 58)** that runs on web, Android and iOS: sign-up per market (US/IL/UK/DE), document **OCR** review, identity verification, payments with a **$500 daily limit** |
| **BDD suite** (`e2e/`) | **Cucumber/Gherkin + Playwright + TypeScript** — 38 scenarios / 251 steps, layered features → steps → flows → page objects |
| **Dynamic DOM reader** | Fills registration forms it has never seen: reads the live DOM, resolves each field via **catalog → fuzzy → semantic map → type**, learns into a catalog, reports drift |
| **Smart find** | Finds elements from plain descriptions ("Create account button") and **self-heals** renamed test IDs, reporting what to fix |
| **Testing HUD** | Overlay in the headed browser: pause / step / inspect / stop a run at any time |
| **Test Runner Console** | Local dashboard to pick scenarios, plant bugs, run, and watch results live |
| **Quality KPIs** | Pass rate, flakiness, durations, and a **bug hunt** that plants real bugs and measures how many the suite catches (currently **5/5**) |
| **CI** | GitHub Actions + Azure Pipelines, publishing a quality dashboard |

---

## Quick start

```bash
# 1. Build the app for web
cd app && npm ci && npx expo export --platform web

# 2. Install the suite
cd ../e2e && npm ci && npx playwright install chromium

# 3. Serve PayDemo (SPA mode) and run everything
npm run serve &            # http://localhost:8081
npx cucumber-js            # 38 scenarios
```

### Ways to run

| Command | What it does |
|---|---|
| `npx cucumber-js` | Full suite, 2 parallel workers, 1 retry |
| `npm run test:smoke` | `@smoke` only |
| `HEADED=1 npx cucumber-js --tags @payments` | Visible browser **with the testing HUD** |
| `BUGS=limit-check npx cucumber-js` | Run against a build with a planted bug |
| `VIEWPORT=mobile npx cucumber-js` | Pixel 7 emulation |
| `npm run console` | **Test Runner Console** at http://localhost:4000 |
| `npm run bug-hunt` | Plant each bug in turn → detection rate |
| `npm run kpi && npm run site` | KPIs + quality dashboard in `site/` |
| `npm run discover -- --market de` | See how the dynamic reader resolves a form |
| `npm run catalog -- merge` | Fold learned fields into the catalog (with hygiene) |

---

## What's worth looking at

### 1. BDD that reads like the product

```gherkin
@critical
Scenario Outline: Payments over the daily limit are rejected ($<amount>)
  Given I am a verified customer with $1,000.00
  When I try to send $<amount> to "friend@example.com"
  Then the payment is rejected with "Amount exceeds your daily limit of $500.00"
  And my balance is still $1,000.00
```

Steps are thin; business flows and page objects carry the logic; selectors
live in exactly one place. Preconditions use **test-data seeding**
(`?seed=verified-user`) instead of clicking through onboarding for every
payment test. Every wait is web-first. There are no `sleep()` calls anywhere.

### 2. The dynamic DOM reader

Market sign-up forms differ in fields, labels, **languages** and formats, and
most fields have **no test IDs**. One thin outline covers them all:

```gherkin
Scenario Outline: Register in <market> without hand-written selectors
  Given I open sign-up for the "<market>" market
  When the dynamic DOM reader completes the form
  Then registration is accepted
  And every field was resolved
  And no form drift is detected
  Examples: | us | il | uk | de |
```

The reader finds labels whether they come from `aria-label`, a visible text
sibling, or only a placeholder. It generates **valid, market-aware data**: a
checksummed Israeli ID, a UK postcode, dates in whatever format the
placeholder shows. It learns what it resolved into
`e2e/dynamic/dynamic-field-catalog.json`, writes a **field report** with a
suggested stable selector for every field, and flags **drift** against a
committed baseline. Onboarding a new market is a playbook, not a project:
see [`.claude/skills/onboard-flow`](.claude/skills/onboard-flow/SKILL.md).

### 3. Proving the tests work: the bug hunt

PayDemo has a **bug mode**. `npm run bug-hunt` switches each planted bug on
alone and re-runs the suite:

| Planted bug | Caught by |
|---|---|
| `email-validation`: malformed emails accepted | 3 scenarios |
| `kyc-stuck`: verification never completes | 4 scenarios |
| `expiry-check`: expired documents accepted | 1 scenario |
| `limit-check`: limit enforced at $600 | 3 scenarios |
| `balance-update`: balance not deducted | 2 scenarios |

New tests are checked the same way: they're shown **red against the bug
first**, then green against the fix (see the regression scenarios).

### 4. Tooling for the people running tests

- **Testing HUD** (`HEADED=1`): Pause/Resume (F8), Step (F10), Inspect (Playwright
  inspector, action-level stepping), Stop. It lives in a closed shadow DOM, so
  tests can't see it.
- **Test Runner Console** (`npm run console`): choose features, tags or
  individual scenarios, plant bugs, and watch each scenario turn green or red
  live, with run history and HTML reports.
- **Quality dashboard** (`site/`): pass rate, flakiness, results by feature, bug-hunt
  matrix, dynamic-reader resolution per market, slowest scenarios.

---

## Project structure

```
app/                      PayDemo — Expo / React Native (web + mobile)
  src/app/                screens (Expo Router)
  src/lib/                markets, OCR mock, validation, planted bugs
e2e/
  features/               Gherkin
  src/steps/              thin step definitions
  src/app/                flows + page objects (+ self-healing)
  src/dynamic/            DOM reader, resolver, catalog, generators, drift, smart find
  src/support/            world, hooks, env, testing HUD
  scripts/                kpi, bug-hunt, catalog, discover, build-site
  console/                Test Runner Console (server + UI)
  dynamic/                learned catalog + drift baselines (committed)
dashboard/                quality dashboard template
.github/workflows/qa.yml  CI (GitHub Actions)
azure-pipelines.yml       CI (Azure DevOps)
docs/ARCHITECTURE.md      how it fits together
```

## Roadmap

- **Mobile:** the same Gherkin against the native app with **Detox**
  (PayDemo already exposes the same `testID`s on mobile).
- **AI agents:** prompt → reviewed test (Architect / Discovery / Coder /
  Reviewer / Tester), and failure triage that classifies a failure as a real bug,
  a flaky test, or an environment issue.

---

Built with Expo, React Native, Playwright, Cucumber and TypeScript.
Code assisted by Claude Code.
