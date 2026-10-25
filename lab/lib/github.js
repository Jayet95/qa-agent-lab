import { repoOf } from './config.js';

const WORKFLOW = 'lab-run.yml';

function headers(env) {
  return {
    authorization: `Bearer ${env.GITHUB_TOKEN}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'qa-agent-lab-live',
  };
}

/** Starts the lab-run workflow. GitHub answers 204 with no run id. */
export async function dispatch(env, inputs) {
  const res = await fetch(`https://api.github.com/repos/${repoOf(env)}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: 'POST',
    headers: { ...headers(env), 'content-type': 'application/json' },
    body: JSON.stringify({ ref: env.GITHUB_REF || 'master', inputs }),
  });
  if (res.status !== 204) throw new Error(`GitHub dispatch failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
}

/** Finds the workflow run for a lab run id via its run-name "Lab run <id>". */
export async function findRun(env, id) {
  const res = await fetch(
    `https://api.github.com/repos/${repoOf(env)}/actions/workflows/${WORKFLOW}/runs?event=workflow_dispatch&per_page=20`,
    { headers: headers(env) },
  );
  if (!res.ok) return null;
  const { workflow_runs: runs = [] } = await res.json();
  const run = runs.find((r) => r.display_title === `Lab run ${id}`);
  return run ? { url: run.html_url, status: run.status, conclusion: run.conclusion } : null;
}
