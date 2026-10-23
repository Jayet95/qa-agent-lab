import type { FieldDescriptor } from './types';

/**
 * Valid test data per semantic field, aware of the market and of the format
 * the form itself advertises (placeholder, maxlength).
 */
export interface GeneratorContext {
  market: string;
  uniqueSuffix: string;
}

const DOB = { day: 14, month: 5, year: 1990 };
const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** Formats the DOB to whatever pattern the placeholder shows. */
function formatDate(placeholder: string | null): string {
  const p = (placeholder ?? '').toUpperCase();
  const { day, month, year } = DOB;
  if (/TT\.MM\.JJJJ|DD\.MM\.YYYY/.test(p)) return `${pad(day)}.${pad(month)}.${year}`;
  if (/MM\/DD\/YYYY/.test(p)) return `${pad(month)}/${pad(day)}/${year}`;
  if (/DD\/MM\/YYYY/.test(p)) return `${pad(day)}/${pad(month)}/${year}`;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Israeli ID (Teudat Zehut) with a valid check digit. */
export function israeliId(seed = Date.now()): string {
  const body = String(seed % 1e8).padStart(8, '0');
  const sum = [...body].reduce((acc, ch, i) => {
    let n = Number(ch) * ((i % 2) + 1);
    if (n > 9) n -= 9;
    return acc + n;
  }, 0);
  return body + String((10 - (sum % 10)) % 10);
}

const digits = (n: number) => Array.from({ length: n }, (_, i) => String((i * 7 + 3) % 10)).join('');

const PHONE: Record<string, string> = { us: '(415) 555-0134', il: '050-123-4567', uk: '07700 900123', de: '+49 151 23456789' };
const POSTAL: Record<string, string> = { us: '94107', uk: 'SW1A 1AA', de: '10115', il: '6100000' };
const CITY: Record<string, string> = { il: 'Tel Aviv', de: 'Berlin', uk: 'London', us: 'San Francisco' };

export function generate(key: string, d: FieldDescriptor, ctx: GeneratorContext): string {
  switch (key) {
    case 'firstName': return 'Noa';
    case 'lastName': return 'Cohen';
    case 'fullName': return 'Noa Cohen';
    case 'email': return `noa.${ctx.uniqueSuffix}@paydemo.dev`;
    case 'password': return 'Secur3pass';
    case 'phone': return PHONE[ctx.market] ?? PHONE.us;
    case 'postalCode': return POSTAL[ctx.market] ?? '12345';
    case 'city': return CITY[ctx.market] ?? 'Springfield';
    case 'dateOfBirth': return formatDate(d.placeholder);
    case 'nationalId': return ctx.market === 'il' ? israeliId() : digits(d.maxLength ?? 9);
    case 'ssnLast4': return '4321';
    case 'taxId': return digits(d.maxLength ?? 11);
    case 'referralCode': return 'WELCOME10';
    case 'state':
    case 'choice': return d.options[0] ?? '';
    case 'digits': return digits(d.maxLength ?? 6);
    default: return 'Test value';
  }
}

/** Values that must never appear in reports. */
export const SENSITIVE = new Set(['password', 'nationalId', 'ssnLast4', 'taxId']);
export const mask = (key: string | null, value: string) =>
  key && SENSITIVE.has(key) ? `${'•'.repeat(Math.max(0, value.length - 2))}${value.slice(-2)}` : value;
