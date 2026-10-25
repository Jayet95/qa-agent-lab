#!/usr/bin/env bash
# One-time Codespace setup: build PayDemo for web and install the suite.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▶ Building PayDemo (web)…"
(cd app && npm ci --no-audit --no-fund && npx expo export --platform web)

echo "▶ Installing the test suite + Chromium…"
(cd e2e && npm ci --no-audit --no-fund && npx playwright install --with-deps chromium)

echo "✓ Ready. The Test Runner Console opens on port 4000."
