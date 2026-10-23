/**
 * Market-specific sign-up forms. Deliberately inconsistent, like real
 * products that grew market by market: different labels (and languages),
 * field sets, formats — and not every field has a testID. Some fields are
 * labelled only visually, some only by placeholder. This is what the e2e
 * "dynamic DOM reader" has to cope with.
 */
export type MarketId = 'us' | 'il' | 'uk' | 'de';

/** How the field exposes its name to assistive tech / automation. */
export type LabelMode = 'aria' | 'visual' | 'placeholder';

export interface MarketField {
  key: string;               // internal only — never rendered into the DOM
  label: string;
  kind: 'text' | 'email' | 'password' | 'tel' | 'numeric' | 'choice';
  placeholder?: string;
  testID?: string;           // missing on purpose for many fields
  labelMode?: LabelMode;     // default 'aria'
  maxLength?: number;
  options?: string[];        // for 'choice'
  validate: (v: string) => string | null;
}

export interface Market {
  id: MarketId;
  name: string;
  flag: string;
  submitLabel: string;
  fields: MarketField[];
}

const required = (msg: string) => (v: string) => (v.trim().length >= 2 ? null : msg);
const email = (msg: string) => (v: string) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : msg);
const password = (short: string, digit: string) => (v: string) =>
  v.length < 8 ? short : /\d/.test(v) ? null : digit;
const matches = (re: RegExp, msg: string) => (v: string) => (re.test(v.trim()) ? null : msg);
const digitsOnly = (v: string) => v.replace(/[\s()+\-.]/g, '');

/** Israeli ID (Teudat Zehut) checksum. */
export function isValidIsraeliId(raw: string): boolean {
  const id = raw.trim();
  if (!/^\d{5,9}$/.test(id)) return false;
  const padded = id.padStart(9, '0');
  const sum = [...padded].reduce((acc, ch, i) => {
    let n = Number(ch) * ((i % 2) + 1);
    if (n > 9) n -= 9;
    return acc + n;
  }, 0);
  return sum % 10 === 0;
}

function adultDate(day: number, month: number, year: number): boolean {
  const d = new Date(year, month - 1, day);
  if (d.getMonth() !== month - 1 || d.getDate() !== day) return false;
  const adult = new Date(year + 18, month - 1, day);
  return adult <= new Date();
}

const dob = (re: RegExp, order: 'dmy', format: string, adultMsg: string) => (v: string) => {
  const m = re.exec(v.trim());
  if (!m) return `Use the format ${format}`;
  const [, a, b, c] = m.map(Number);
  return adultDate(a, b, c) ? null : adultMsg;
};

export const MARKETS: Record<MarketId, Market> = {
  us: {
    id: 'us',
    name: 'United States',
    flag: '🇺🇸',
    submitLabel: 'Create account',
    fields: [
      { key: 'firstName', label: 'First name', kind: 'text', testID: 'signup-first-name', validate: required('Enter your first name') },
      { key: 'lastName', label: 'Last name', kind: 'text', labelMode: 'visual', validate: required('Enter your last name') },
      { key: 'email', label: 'Email address', kind: 'email', testID: 'signup-email', validate: email('Enter a valid email address') },
      { key: 'password', label: 'Password', kind: 'password', testID: 'signup-password', validate: password('Password must be at least 8 characters', 'Password must include a number') },
      { key: 'phone', label: 'Mobile phone', kind: 'tel', placeholder: '(555) 123-4567', labelMode: 'visual',
        validate: (v) => (digitsOnly(v).length === 10 ? null : 'Enter a 10-digit US phone number') },
      { key: 'state', label: 'State', kind: 'choice', options: ['California', 'New York', 'Texas', 'Florida', 'Washington'],
        validate: (v) => (v ? null : 'Choose your state') },
      { key: 'zip', label: 'ZIP code', kind: 'numeric', maxLength: 5, labelMode: 'placeholder', placeholder: 'ZIP code',
        validate: matches(/^\d{5}$/, 'Enter a 5-digit ZIP code') },
      { key: 'ssn4', label: 'SSN (last 4 digits)', kind: 'numeric', maxLength: 4,
        validate: matches(/^\d{4}$/, 'Enter the last 4 digits of your SSN') },
    ],
  },
  il: {
    id: 'il',
    name: 'Israel',
    flag: '🇮🇱',
    submitLabel: 'Open account',
    fields: [
      { key: 'fullName', label: 'Full name', kind: 'text', testID: 'signup-name', validate: required('Enter your full name') },
      { key: 'email', label: 'E-mail', kind: 'email', validate: email('Enter a valid email address') },
      { key: 'password', label: 'Password', kind: 'password', testID: 'signup-password', validate: password('Password must be at least 8 characters', 'Password must include a number') },
      { key: 'nationalId', label: 'Teudat Zehut (ID number)', kind: 'numeric', maxLength: 9, labelMode: 'visual',
        validate: (v) => (isValidIsraeliId(v) ? null : 'Enter a valid Israeli ID number') },
      { key: 'city', label: 'City', kind: 'text', validate: required('Enter your city') },
      { key: 'phone', label: 'Phone', kind: 'tel', placeholder: '050-123-4567',
        validate: (v) => (/^(\+972|0)5\d{8}$/.test(digitsOnly(v).replace(/^972/, '+972')) ? null : 'Enter an Israeli mobile number') },
    ],
  },
  uk: {
    id: 'uk',
    name: 'United Kingdom',
    flag: '🇬🇧',
    submitLabel: 'Register',
    fields: [
      { key: 'fullName', label: 'Your full name', kind: 'text', labelMode: 'visual', validate: required('Enter your full name') },
      { key: 'email', label: 'Email', kind: 'email', testID: 'signup-email', validate: email('Enter a valid email address') },
      { key: 'password', label: 'Create a password', kind: 'password', validate: password('Password must be at least 8 characters', 'Password must include a number') },
      { key: 'dob', label: 'Date of birth', kind: 'text', placeholder: 'DD/MM/YYYY',
        validate: dob(/^(\d{2})\/(\d{2})\/(\d{4})$/, 'dmy', 'DD/MM/YYYY', 'You must be at least 18') },
      { key: 'postcode', label: 'Postcode', kind: 'text', labelMode: 'visual',
        validate: matches(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, 'Enter a valid UK postcode') },
      { key: 'phone', label: 'Mobile number', kind: 'tel', placeholder: '07700 900123',
        validate: (v) => (/^(\+44|0)7\d{9}$/.test(digitsOnly(v).replace(/^44/, '+44')) ? null : 'Enter a UK mobile number') },
    ],
  },
  de: {
    id: 'de',
    name: 'Deutschland',
    flag: '🇩🇪',
    submitLabel: 'Konto eröffnen',
    fields: [
      { key: 'firstName', label: 'Vorname', kind: 'text', validate: required('Bitte Vornamen eingeben') },
      { key: 'lastName', label: 'Nachname', kind: 'text', labelMode: 'visual', validate: required('Bitte Nachnamen eingeben') },
      { key: 'email', label: 'E-Mail-Adresse', kind: 'email', validate: email('Bitte gültige E-Mail-Adresse eingeben') },
      { key: 'password', label: 'Passwort', kind: 'password', validate: password('Mindestens 8 Zeichen', 'Mindestens eine Ziffer') },
      { key: 'dob', label: 'Geburtsdatum', kind: 'text', placeholder: 'TT.MM.JJJJ', labelMode: 'visual',
        validate: dob(/^(\d{2})\.(\d{2})\.(\d{4})$/, 'dmy', 'TT.MM.JJJJ', 'Mindestalter 18 Jahre') },
      { key: 'postcode', label: 'Postleitzahl', kind: 'numeric', maxLength: 5, validate: matches(/^\d{5}$/, 'Bitte 5-stellige PLZ eingeben') },
      { key: 'taxId', label: 'Steuer-ID', kind: 'numeric', maxLength: 11, labelMode: 'placeholder', placeholder: 'Steuer-ID (11 Ziffern)',
        validate: matches(/^\d{11}$/, 'Die Steuer-ID hat 11 Ziffern') },
    ],
  },
};

/** `?drift=form` — simulate a release that changed the US form. */
export function applyFormDrift(market: Market): Market {
  if (market.id !== 'us') return market;
  return {
    ...market,
    fields: [
      ...market.fields.map((f) => (f.key === 'zip' ? { ...f, label: 'Postal / ZIP code', placeholder: 'Postal / ZIP code' } : f)),
      { key: 'referral', label: 'Referral code (optional)', kind: 'text', validate: () => null },
    ],
  };
}

export function displayName(market: MarketId, values: Record<string, string>): string {
  return values.fullName ?? `${values.firstName ?? ''} ${values.lastName ?? ''}`.trim();
}
