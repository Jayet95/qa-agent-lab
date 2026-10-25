const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** `lenient` is the planted bug: anything containing "@" passes. */
export function isValidEmail(email: string, lenient = false): boolean {
  return lenient ? email.includes('@') : EMAIL_RE.test(email.trim());
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (!/\d/.test(pw)) return 'Password must include a number';
  return null;
}

/** Digits with an optional sign and decimal part; "$" and "," are allowed as formatting. */
const AMOUNT_RE = /^-?\d+(\.\d*)?$/;
const clean = (raw: string) => raw.replace(/[$,\s]/g, '');

/** Returns null for anything that isn't a plain number ("abc", "12abc", "1e3", "#!"). */
export function parseAmount(raw: string): number | null {
  const s = clean(raw);
  return AMOUNT_RE.test(s) ? Math.round(Number(s) * 100) / 100 : null;
}

/** Problems with how an amount is written, before any business rule. */
export function amountFormatProblem(raw: string): string | null {
  const s = clean(raw);
  if (s === '') return null;
  if (!AMOUNT_RE.test(s)) return 'Enter a valid number, like 25 or 25.50';
  if ((s.split('.')[1] ?? '').length > 2) return 'Use at most 2 decimal places';
  return null;
}
