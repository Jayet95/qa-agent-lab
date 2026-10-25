/**
 * Where PayDemo's own test tooling lives, so a visitor on the deployed app
 * can jump to it. Override per environment with EXPO_PUBLIC_* build vars.
 */
export const QA_LINKS = {
  lab: process.env.EXPO_PUBLIC_LAB_URL || 'https://qa-agent-lab-live.jayet95.workers.dev',
  dashboard: process.env.EXPO_PUBLIC_DASHBOARD_URL || 'https://jayet95.github.io/qa-agent-lab/',
  repo: 'https://github.com/Jayet95/qa-agent-lab',
};
