#!/bin/bash
# Tries the next version of ASO Companion on this Mac, on port 3100, without touching the real data.
# Double-click it. Edits made in the test app are saved to a separate "sandbox" branch on GitHub, never to main.
cd "$(dirname "$0")" || exit 1
BRANCH="${1:-wa-notext}"
command -v node >/dev/null 2>&1 || { echo "Install Node.js first (see LOCAL.md)."; read -n 1 -s -r -p "Press any key."; exit 1; }
echo "Getting the newest work on '$BRANCH'..."
git fetch origin || exit 1
git stash -u -q 2>/dev/null
git checkout "$BRANCH" && git pull --ff-only origin "$BRANCH" || { echo "Could not update. Take a photo of this window."; read -n 1 -s -r -p "Press any key."; exit 1; }
git ls-remote --exit-code --heads origin sandbox >/dev/null 2>&1 || git push origin origin/main:refs/heads/sandbox
npm install --no-audit --no-fund || exit 1
echo
echo "Open http://localhost:3100 (test copy, sandbox data). Close this window to stop."
(sleep 6; open http://localhost:3100) &
GITHUB_BRANCH=sandbox ASO_LOCAL=1 PORT=3100 npx next dev -p 3100
