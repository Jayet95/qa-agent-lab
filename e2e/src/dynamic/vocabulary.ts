/**
 * What the resolver knows about the world, independent of any one market.
 * Adding a market is usually zero code; at most a synonym or a rule here.
 */

/** Fuzzy layer: known phrasings per semantic field (any language). */
export const SYNONYMS: Record<string, string[]> = {
  firstName: ['first name', 'given name', 'forename', 'vorname'],
  lastName: ['last name', 'surname', 'family name', 'nachname'],
  fullName: ['full name', 'your full name', 'name', 'vollständiger name'],
  email: ['email', 'e-mail', 'email address', 'e-mail-adresse', 'e-mail address'],
  password: ['password', 'create a password', 'passwort', 'kennwort'],
  phone: ['phone', 'phone number', 'mobile', 'mobile phone', 'mobile number', 'telefon', 'handynummer'],
  postalCode: ['zip', 'zip code', 'postcode', 'postal code', 'plz', 'postleitzahl'],
  city: ['city', 'town', 'stadt', 'ort'],
  state: ['state', 'province', 'region', 'bundesland'],
  dateOfBirth: ['date of birth', 'birth date', 'dob', 'geburtsdatum'],
  nationalId: ['id number', 'national id', 'identity number', 'teudat zehut'],
  ssnLast4: ['ssn', 'ssn last 4', 'social security number'],
  taxId: ['tax id', 'steuer-id', 'steuer id', 'tin'],
  referralCode: ['referral code', 'promo code', 'invite code'],
};

/** Semantic layer: looser keyword rules for labels the fuzzy layer misses. */
export const SEMANTIC_RULES: { key: string; test: RegExp }[] = [
  { key: 'dateOfBirth', test: /birth|geburt|\bdob\b|dd\/mm\/yyyy|tt\.mm\.jjjj|mm\/dd\/yyyy/i },
  { key: 'postalCode', test: /\bzip\b|post\s*code|postal|postleitzahl|\bplz\b/i },
  { key: 'nationalId', test: /teudat|national\s*id|id\s*number|identity\s*(no|number)/i },
  { key: 'ssnLast4', test: /\bssn\b|social\s*security/i },
  { key: 'taxId', test: /steuer|tax\s*id|\btin\b/i },
  { key: 'phone', test: /phone|mobile|telefon|handy/i },
  { key: 'email', test: /e-?mail/i },
  { key: 'password', test: /pass(word|wort)|kennwort/i },
  { key: 'firstName', test: /first|given|vorname/i },
  { key: 'lastName', test: /last\s*name|surname|family|nachname/i },
  { key: 'fullName', test: /full\s*name|^name$/i },
  { key: 'city', test: /\bcity\b|\btown\b|stadt/i },
  { key: 'state', test: /\bstate\b|province|bundesland/i },
  { key: 'referralCode', test: /referral|promo|invite/i },
];

/** Type layer: last resort, from the control's type alone. */
export const TYPE_DEFAULTS: Record<string, string | undefined> = {
  email: 'email',
  password: 'password',
  tel: 'phone',
  date: 'dateOfBirth',
  choice: 'choice',
  numeric: 'digits',
};
