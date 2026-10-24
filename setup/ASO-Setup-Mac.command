#!/bin/bash
# ASO Companion setup for a Mac. Double-click this file (the first time: right-click it, choose Open, then Open).
# A Terminal window shows what is happening. Leave it open until it says "All done".
REPO="justkhalid/aso-companion"
DIR="$HOME/aso-companion"
LOG="/tmp/aso-setup.log"
: > "$LOG"
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
export GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never

say()  {
  case "$1" in
    "  "*) printf '   \033[32m\xe2\x9c\x93\033[0m %s\n' "${1#  }" ;;
    "") echo ;;
    *)  printf '\033[1;34m\xe2\x96\xb8\033[0m \033[1m%s\033[0m\n' "$1" ;;
  esac
  echo "$1" >> "$LOG"
}
stop() {
  echo
  echo "Something went wrong: $1"
  echo "The details are in the file $LOG. Send that file to the developer."
  osascript -e "display dialog \"Something went wrong: $1\" buttons {\"OK\"} default button 1 with title \"ASO Companion setup\" with icon stop" >/dev/null 2>&1
  read -n 1 -s -r -p "Press any key to close."
  exit 1
}

clear
printf '\n  \033[1;34mASO Companion\033[0m\n'
printf '  \033[2mAmerican Space Oujda, setup on this computer\033[0m\n'
printf '  \033[2mIt takes about 5 to 10 minutes. Leave this window open.\033[0m\n'
echo

# ---- the token ----
TOKEN=$(osascript -e 'text returned of (display dialog "Paste the GitHub token here, then press OK:" default answer "" with title "ASO Companion setup" buttons {"Cancel", "OK"} default button "OK")' 2>/dev/null)
[ -z "$TOKEN" ] && { echo "No token entered. Nothing was installed."; exit 0; }
TOKEN=$(printf '%s' "$TOKEN" | tr -d '[:space:]')

say "Checking the token..."
CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" -H "User-Agent: aso-setup" "https://api.github.com/repos/$REPO")
[ "$CODE" = "200" ] || stop "GitHub did not accept this token (code $CODE). Check that it is copied completely."
say "  token accepted"

# ---- Git (the Mac offers its own developer tools) ----
if ! xcode-select -p >/dev/null 2>&1 || ! command -v git >/dev/null 2>&1; then
  say "Installing Git. A Mac window asks about developer tools: press Install, then wait here."
  xcode-select --install >/dev/null 2>&1
  for i in $(seq 1 360); do
    xcode-select -p >/dev/null 2>&1 && command -v git >/dev/null 2>&1 && break
    sleep 5
  done
  command -v git >/dev/null 2>&1 || stop "Git was not installed. Run this setup again after installing the developer tools."
fi
say "  Git is ready"

# ---- Node.js ----
if ! command -v node >/dev/null 2>&1; then
  say "Installing Node.js. The Mac asks for your password once."
  JSON=$(curl -s https://nodejs.org/dist/index.json) || stop "Could not reach nodejs.org."
  VER=$(printf '%s' "$JSON" | python3 -c "import sys,json; print(next(r['version'] for r in json.load(sys.stdin) if r['lts']))" 2>/dev/null)
  [ -n "$VER" ] || stop "Could not find the current Node.js version."
  PKG="/tmp/aso-node.pkg"
  curl -sL -o "$PKG" "https://nodejs.org/dist/$VER/node-$VER.pkg" || stop "Could not download Node.js."
  osascript -e "do shell script \"installer -pkg $PKG -target /\" with administrator privileges" >> "$LOG" 2>&1 || stop "Node.js was not installed."
  export PATH="/usr/local/bin:$PATH"
  command -v node >/dev/null 2>&1 || stop "Node.js was not installed."
fi
say "  Node.js is ready"

# ---- the app ----
B64=$(printf 'x-access-token:%s' "$TOKEN" | base64 | tr -d '\n')
AUTH=(-c credential.helper= -c "http.https://github.com/.extraheader=AUTHORIZATION: basic $B64")
if [ -d "$DIR/.git" ]; then
  say "Updating the app..."
  git -C "$DIR" "${AUTH[@]}" pull --ff-only origin main >> "$LOG" 2>&1 || stop "The app could not be updated."
else
  say "Downloading the app..."
  git "${AUTH[@]}" clone "https://github.com/$REPO.git" "$DIR" >> "$LOG" 2>&1 || stop "The app could not be downloaded. Check that the token is allowed to read the repository."
fi
say "  app downloaded"
cd "$DIR" || stop "The app folder is missing."

if [ ! -f .env.local ]; then
  SECRET=$(LC_ALL=C tr -dc 'a-f0-9' </dev/urandom | head -c 64)
  cat > .env.local <<ENV
ASO_LOCAL=1
ASO_SESSION_SECRET=$SECRET
GITHUB_PAT=$TOKEN
GITHUB_REPO=$REPO
GITHUB_BRANCH=main
META_APP_ID=
META_APP_SECRET=
ENV
  chmod 600 .env.local
  say "  settings file written"
fi

say "Installing the app parts (a few minutes)..."
npm install --no-audit --no-fund >> "$LOG" 2>&1 || stop "The app parts could not be installed."
say "  parts installed"
say "Building the app (a few minutes)..."
npx next build >> "$LOG" 2>&1 || stop "The app could not be built."
git rev-parse HEAD > .next/aso-built.txt 2>/dev/null
say "  app built"

# the menu-bar icon is built now too, so the first start is quick
if command -v swiftc >/dev/null 2>&1; then
  mkdir -p .aso
  say "Preparing the menu-bar icon..."
  swiftc -O ASO-Tray.swift -o ".aso/ASO Companion" >> "$LOG" 2>&1 || say "  (the menu-bar icon was skipped)"
fi

chmod +x "ASO Companion.app/Contents/MacOS/ASO Companion" Start-ASO.command 2>/dev/null
xattr -dr com.apple.quarantine "$DIR" 2>/dev/null
osascript -e "tell application \"Finder\" to make alias file to POSIX file \"$DIR/ASO Companion.app\" at desktop" >/dev/null 2>&1

echo
say "All done. ASO Companion opens now."
open "$DIR/ASO Companion.app"
sleep 4
