#!/bin/bash
# Starts ASO Companion on a Mac. Double-click this file in Finder (the first time: right-click > Open).
cd "$(dirname "$0")" || exit 1

fail() {
  echo
  echo "Something went wrong. Take a photo of this window and send it to the developer."
  read -n 1 -s -r -p "Press any key to close."
  exit 1
}

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed on this computer."
  echo "The download page opens now. Install the LTS version, then double-click this file again."
  open https://nodejs.org/en/download
  read -n 1 -s -r -p "Press any key to close."
  exit 1
fi

if [ ! -f .env.local ]; then
  echo "First start: making the settings file..."
  SECRET=$(LC_ALL=C tr -dc 'a-f0-9' </dev/urandom | head -c 64)
  cat > .env.local <<ENV
ASO_LOCAL=1
ASO_SESSION_SECRET=$SECRET
GITHUB_PAT=
GITHUB_REPO=justkhalid/aso-companion
GITHUB_BRANCH=main
META_APP_ID=
META_APP_SECRET=
ENV
  echo
  echo "TextEdit opens now. After GITHUB_PAT= paste the GitHub token, save the file and close it."
  echo "See LOCAL.md for how to make the token."
  open -e .env.local
  read -p "When the token is saved, press Enter here. "
fi

self_update() {
  command -v git >/dev/null 2>&1 || return 0
  export GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never
  PAT=$(grep -m1 '^GITHUB_PAT=' .env.local 2>/dev/null | cut -d= -f2- | tr -d '\r')
  if [ -n "$PAT" ]; then
    B64=$(printf 'x-access-token:%s' "$PAT" | base64 | tr -d '\n')
    git -c credential.helper= -c "http.https://github.com/.extraheader=AUTHORIZATION: basic $B64" pull --ff-only origin main >/dev/null 2>&1
  else
    git pull --ff-only origin main >/dev/null 2>&1
  fi
  return 0
}

while true; do
  self_update
  HEAD=$(git rev-parse HEAD 2>/dev/null)
  BUILT=$(cat .next/aso-built.txt 2>/dev/null)
  if [ ! -d node_modules ] || [ ! -f .next/BUILD_ID ] || [ "$HEAD" != "$BUILT" ]; then
    echo
    echo "Getting the app ready. This takes a few minutes the first time and after an update."
    npm install --no-audit --no-fund || fail
    npx next build || fail
    [ -n "$HEAD" ] && echo "$HEAD" > .next/aso-built.txt
  fi
  echo
  echo "ASO Companion is starting. Keep this window open while you use the app."
  (sleep 10; open http://localhost:3000/admin) &
  npx next start -H 127.0.0.1 -p 3000
  code=$?
  # exit code 3 means "updated, start again"
  if [ "$code" -eq 3 ]; then continue; fi
  echo
  read -n 1 -s -r -p "The app stopped. Press any key to start it again, or close this window."
  echo
done
