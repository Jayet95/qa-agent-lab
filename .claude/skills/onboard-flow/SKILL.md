---
name: onboard-flow
description: Onboard a new registration market or form flow onto the dynamic DOM reader — discover the form, close resolution gaps (synonym / semantic rule / generator), learn into the catalog, record a drift baseline, and add a thin Gherkin test. Use when someone asks to add a market/country, cover a new sign-up or KYC form, or when a dynamic run reports unresolved fields or drift.
---

# Onboard a flow onto the dynamic DOM reader

Goal: a new market or form gets covered with **a thin test plus small
vocabulary fixes** — never hand-written selectors.

Everything below runs from `e2e/`, with PayDemo served on `BASE_URL`
(default `http://localhost:8081`; `npm run serve` serves the built app).

## 1. Discover

```bash
npm run discover -- --market <id>                     # PayDemo market form
npm run discover -- --url "<form url>" --flow <name>  # any other form
```

It prints a field report: how every control is labelled (aria / visual /
placeholder), what it resolved to, and which layer decided
(`catalog → fuzzy → semantic → type`). Exit code 1 means some fields need
attention. Artifacts land in `reports/dynamic/`.

## 2. Close the gaps — smallest fix first

For each field marked `unresolved`, or resolved only by `type` (a guess):

| Symptom | Fix | Where |
|---|---|---|
| New wording / language for a known field (`"Código postal"`) | add a **synonym** | `src/dynamic/vocabulary.ts` → `SYNONYMS` |
| Label is long/noisy but contains a clear keyword (`"Your national insurance no."`) | add a **semantic rule** | `vocabulary.ts` → `SEMANTIC_RULES` |
| A genuinely new kind of field (`nationalInsurance`) | add the key to `SYNONYMS`/rules **and** a **generator** that produces valid data | `src/dynamic/generators.ts` → `generate()` |
| Form rejects generated data (see `validationErrors` in the report) | make the generator market-aware (format, checksum, length) | `generators.ts` |
| No label at all | ask the app team for a label/testID; meanwhile a rule on `placeholder` or `kind` | — |

Re-run discovery until it exits 0. Never add a CSS/XPath selector for a
field — if the reader can't name it, users of assistive tech can't either;
log that as an accessibility bug.

## 3. Prove it end to end

Add a row to the `Examples` table in `features/dynamic-registration.feature`
(or a new thin `Scenario Outline` for a different flow), then:

```bash
UPDATE_BASELINE=1 npx cucumber-js --tags @dynamic --name "<market>"   # record the drift baseline
npx cucumber-js --tags @dynamic                                       # must pass without UPDATE_BASELINE
npm run catalog -- merge                                              # fold learned fields in (with hygiene)
```

## 4. Review and commit

- `dynamic/dynamic-field-catalog.json` — check new entries map to the right keys;
  `npm run catalog -- hygiene` flags conflicts/ambiguous labels.
- `dynamic/baselines/<flow>.json` — the form's expected shape.
- vocabulary/generator changes + the feature row.

Commit them together: "onboard <market> sign-up".

## When a run reports drift instead

Drift (`added` / `removed` / `remapped` fields) means the form changed
since its baseline. If the change is intended, re-run step 3 with
`UPDATE_BASELINE=1` and commit; if not, it's a product bug — file it with
the field report attached.
