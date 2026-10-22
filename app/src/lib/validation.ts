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

export function parseAmount(raw: string): number | null {
  const n = Number(raw.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}
