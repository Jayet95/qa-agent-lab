import { Platform } from 'react-native';

/**
 * Planted bugs. Turning one on makes PayDemo misbehave in a realistic way,
 * so the test suite can prove it catches it.
 */
export const BUGS = {
  'email-validation': 'Sign-up accepts malformed email addresses',
  'kyc-stuck': 'Identity verification never completes',
  'expiry-check': 'Expired identity documents are accepted',
  'limit-check': 'Daily send limit is enforced at $600 instead of $500',
  'balance-update': 'Balance is not deducted after a payment',
} as const;

export type BugId = keyof typeof BUGS;

/** Test-data shortcuts, like seeding a DB before a UI test. */
export type Seed = 'verified-user' | 'unverified-user' | null;

export interface LaunchParams {
  bugs: BugId[];
  seed: Seed;
}

/**
 * Read launch parameters. On web they come from the URL
 * (`?bugs=limit-check,balance-update&seed=verified-user`); native launch
 * arguments are wired up in the mobile phase.
 */
export function readLaunchParams(): LaunchParams {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return { bugs: [], seed: null };
  }
  const q = new URLSearchParams(window.location.search);
  const bugs = (q.get('bugs') ?? '')
    .split(',')
    .map((b) => b.trim())
    .filter((b): b is BugId => b in BUGS);
  const seedParam = q.get('seed');
  const seed: Seed =
    seedParam === 'verified-user' || seedParam === 'unverified-user' ? seedParam : null;
  return { bugs, seed };
}
