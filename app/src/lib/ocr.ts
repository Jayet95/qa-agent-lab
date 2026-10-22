/**
 * Mock document OCR. Real providers return each field with a confidence
 * score; low-confidence fields must be reviewed by the user. The ID card
 * deliberately misreads the name (O → 0) so the review step has something
 * to catch.
 */
export type DocType = 'passport' | 'id-card';

export const KYC_FIELDS = ['name', 'dob', 'nationality', 'documentNumber', 'expiry'] as const;
export type KycField = (typeof KYC_FIELDS)[number];

export interface OcrValue {
  value: string;
  confidence: number; // 0..1
}

export type OcrResult = Record<KycField, OcrValue>;

export const LOW_CONFIDENCE = 0.8;

export const FIELD_LABELS: Record<KycField, string> = {
  name: 'Full name',
  dob: 'Date of birth',
  nationality: 'Nationality',
  documentNumber: 'Document number',
  expiry: 'Expiry date',
};

function misread(name: string): string {
  const upper = name.toUpperCase();
  if (upper.includes('O')) return upper.replace('O', '0');
  if (upper.includes('I')) return upper.replace('I', '1');
  return upper.replace(/.$/, '?');
}

export function readDocument(doc: DocType, accountName: string): OcrResult {
  if (doc === 'passport') {
    return {
      name: { value: accountName.toUpperCase(), confidence: 0.98 },
      dob: { value: '1992-04-17', confidence: 0.97 },
      nationality: { value: 'Israeli', confidence: 0.99 },
      documentNumber: { value: 'P4183920', confidence: 0.95 },
      expiry: { value: '2031-08-30', confidence: 0.96 },
    };
  }
  return {
    name: { value: misread(accountName), confidence: 0.61 },
    dob: { value: '1992-04-17', confidence: 0.93 },
    nationality: { value: 'Israeli', confidence: 0.97 },
    documentNumber: { value: '038475129', confidence: 0.9 },
    expiry: { value: '2029-11-14', confidence: 0.88 },
  };
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDate(s: string): Date | null {
  const m = DATE_RE.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Reject impossible dates like 2023-02-31.
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}

const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toUpperCase();

export type KycErrors = Partial<Record<KycField, string | null>>;

/** `acceptExpired` is the planted `expiry-check` bug. */
export function validateField(
  field: KycField,
  value: string,
  accountName: string,
  acceptExpired = false,
  today = new Date(),
): string | null {
  switch (field) {
    case 'name':
      if (!value.trim()) return 'Enter your full name';
      return normalize(value) === normalize(accountName)
        ? null
        : `Name must match your account (${accountName})`;
    case 'dob': {
      const d = parseDate(value);
      if (!d) return 'Use the format YYYY-MM-DD';
      const adult = new Date(d.getFullYear() + 18, d.getMonth(), d.getDate());
      return adult <= today ? null : 'You must be at least 18 years old';
    }
    case 'nationality':
      return value.trim() ? null : 'Enter your nationality';
    case 'documentNumber':
      return /^[A-Z0-9]{6,12}$/i.test(value.trim()) ? null : 'Enter a valid document number';
    case 'expiry': {
      const d = parseDate(value);
      if (!d) return 'Use the format YYYY-MM-DD';
      return acceptExpired || d > today ? null : 'This document has expired';
    }
  }
}
