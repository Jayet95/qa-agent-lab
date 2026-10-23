import { Platform } from 'react-native';
import bugs from './bugs.json';

/**
 * Planted bugs (shared with the e2e bug-hunt). Turning one on makes PayDemo
 * misbehave in a realistic way, so the test suite can prove it catches it.
 */
export const BUGS = bugs;

export type BugId = keyof typeof BUGS;

/** Test-data shortcuts, like seeding a DB before a UI test. */
export type Seed = 'verified-user' | 'unverified-user' | null;

/**
 * Simulated UI changes between releases:
 *  - 'form'    → the US sign-up form gains/renames fields (drift detection)
 *  - 'testids' → some testIDs are renamed (self-healing locators)
 */
export type Drift = 'form' | 'testids';

export interface LaunchParams {
  bugs: BugId[];
  seed: Seed;
  drift: Drift[];
}

/**
 * Read launch parameters. On web they come from the URL
 * (`?bugs=limit-check,balance-update&seed=verified-user`); native launch
 * arguments are wired up in the mobile phase.
 */
export function readLaunchParams(): LaunchParams {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return { bugs: [], seed: null, drift: [] };
  }
  const q = new URLSearchParams(window.location.search);
  const bugs = (q.get('bugs') ?? '')
    .split(',')
    .map((b) => b.trim())
    .filter((b): b is BugId => b in BUGS);
  const seedParam = q.get('seed');
  const seed: Seed =
    seedParam === 'verified-user' || seedParam === 'unverified-user' ? seedParam : null;
  const drift = (q.get('drift') ?? '')
    .split(',')
    .map((d) => d.trim())
    .filter((d): d is Drift => d === 'form' || d === 'testids');
  return { bugs, seed, drift };
}
