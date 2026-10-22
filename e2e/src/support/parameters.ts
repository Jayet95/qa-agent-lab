import { defineParameterType } from '@cucumber/cucumber';

export interface Money {
  /** As typed into the app, e.g. "120.50" or "-5". */
  raw: string;
  value: number;
  /** As the app displays it, e.g. "$120.50". */
  formatted: string;
}

export const formatMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/** `{money}` matches "$1,000.00", "$500", "$-5" in Gherkin. */
defineParameterType({
  name: 'money',
  regexp: /\$(-?[\d,]+(?:\.\d+)?)/,
  transformer: (s: string): Money => {
    const raw = s.replace(/,/g, '');
    const value = Number(raw);
    return { raw, value, formatted: formatMoney(value) };
  },
});
