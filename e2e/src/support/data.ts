import type { NewCustomer } from '../app/flows';

let counter = 0;

/** Unique, valid test customers — no shared accounts between scenarios. */
export function newCustomer(overrides: Partial<NewCustomer> = {}): NewCustomer {
  counter += 1;
  const stamp = `${Date.now().toString(36)}${process.pid}${counter}`;
  return {
    name: 'Noa Cohen',
    email: `noa.${stamp}@paydemo.dev`,
    password: 'Secur3pass',
    ...overrides,
  };
}
