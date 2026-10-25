#!/usr/bin/env bash
# Every Codespace start: serve PayDemo and launch the Test Runner Console.
cd "$(dirname "$0")/../e2e"
nohup npm run serve   > /tmp/paydemo.log 2>&1 &
nohup npm run console > /tmp/console.log 2>&1 &
cat <<'MSG'

🧪 QA Agent Lab is starting:
   • Test Runner Console → port 4000 (opens automatically)
   • PayDemo             → port 8081
   • Desktop for headed runs + the HUD → port 6080 (password: vscode)

   Or from this terminal:  cd e2e && npx cucumber-js --tags @smoke
MSG
