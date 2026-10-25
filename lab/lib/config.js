// What a visitor may choose. The lab-run workflow re-validates both lists,
// and maps presets to tag expressions itself; free text never reaches CI.
export const PRESETS = {
  smoke: { label: 'Smoke', detail: '5 scenarios · the release gate', tag: '@smoke' },
  critical: { label: 'Critical', detail: '27 scenarios · money & identity', tag: '@critical' },
  payments: { label: 'Payments', detail: '18 scenarios · limits, balances, validation', tag: '@payments' },
  markets: { label: 'Dynamic markets', detail: '6 scenarios · US/IL/UK/DE, no selectors', tag: '@dynamic' },
  all: { label: 'Everything', detail: '53 scenarios', tag: '' },
};

// Mirrors app/src/lib/bugs.json (kept in sync by hand; CI validates the ids).
export const BUGS = {
  'email-validation': 'Sign-up accepts malformed email addresses',
  'kyc-stuck': 'Identity verification never completes',
  'expiry-check': 'Expired identity documents are accepted',
  'limit-check': 'Daily send limit is enforced at $600 instead of $500',
  'balance-update': 'Balance is not deducted after a payment',
};

export const PHASES = ['queued', 'setup', 'building', 'running', 'done', 'error'];
export const TERMINAL = new Set(['done', 'error']);
export const RUN_ID = /^[a-z0-9-]{6,40}$/;
export const RUNS_PER_IP_PER_HOUR = 5;

export const repoOf = (env) => env.GITHUB_REPO || 'Jayet95/qa-agent-lab';

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
