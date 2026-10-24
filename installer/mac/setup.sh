#!/bin/bash
# ASO Companion setup for a Mac. Double-click this file (the first time: right-click it, choose Open, then Open).
# The file carries the app, the build info, the Google keys and the pictures of the progress page after the last line of this script,
# so nothing is downloaded from GitHub and nobody types anything. A page in the browser shows the progress; a Terminal window shows the details.
# Made by installer/build-installer-mac.ps1.
MARK='__ASO_PAYLOAD__'
DIR="${ASO_INSTALL_DIR:-$HOME/aso-companion}"
LOG="/tmp/aso-setup.log"
: > "$LOG"
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
TEST="${ASO_SETUP_TEST:-0}"

# ---- the carried files: everything after the marker line is a .tar.gz ----
unpack_payload() {
  local off
  off=$(grep -a -b -o -m1 "^${MARK}\$" "$0" | head -1 | cut -d: -f1)
  [ -n "$off" ] || return 1
  tail -c +$((off + ${#MARK} + 2)) "$0" | tar -xz -C "$1"
}
if [ "$1" = "--extract" ] && [ -n "$2" ]; then mkdir -p "$2" && unpack_payload "$2"; exit $?; fi

WORK=$(mktemp -d /tmp/aso-setup.XXXXXX) || { echo "Could not make a temporary folder."; exit 1; }
trap 'rm -rf "$WORK"' EXIT
unpack_payload "$WORK" || { echo "This setup file is incomplete. Ask for a new copy of it."; read -n 1 -s -r -p "Press any key to close."; exit 1; }
[ -f "$WORK/app.tar.gz" ] && [ -f "$WORK/google.json" ] || { echo "This setup file is incomplete. Ask for a new copy of it."; read -n 1 -s -r -p "Press any key to close."; exit 1; }

say() {
  case "$1" in
    "  "*) printf '   \033[32m\xe2\x9c\x93\033[0m %s\n' "${1#  }" ;;
    "") echo ;;
    *)  printf '\033[1;34m\xe2\x96\xb8\033[0m \033[1m%s\033[0m\n' "$1" ;;
  esac
  echo "$1" >> "$LOG"
}

# ---- the progress page: pearl glass ground, the crest on top, everything on the middle line ----
PAGE="$WORK/index.html"
STAGES=("Install Node.js" "Unpack the app" "Install the app parts" "Build the app" "Save the settings" "Put the icon on the Desktop")
STATE=(p p p p p p)
MSG=""
HEAD_T="Installing..."
LEAD="Keep this page and the Terminal window open. The Mac may ask for your password once."
DONE=0
PCT=0
# >>> render
render() {
  local rows="" i cls cur=-1 curname="" cap="" refresh='<meta http-equiv="refresh" content="2">'
  for i in "${!STAGES[@]}"; do
    case "${STATE[$i]}" in d) cls=d;; a) cls=c; cur=$i;; f) cls=f; cur=$i;; *) cls=p;; esac
    rows="$rows<li class=$cls></li>"
  done
  if [ "$cur" -ge 0 ]; then cap="STEP $((cur + 1)) OF ${#STAGES[@]}"; curname="${STAGES[$cur]}"; fi
  [ "$DONE" = "1" ] && refresh=""
  cat > "$PAGE" <<HTML
<!doctype html><html><head><meta charset="utf-8">$refresh<title>ASO Companion setup</title><style>
@font-face{font-family:BD;font-style:italic;src:url(assets/bodoni.ttf)}
@font-face{font-family:MR;font-weight:500;src:url(assets/manrope-m.ttf)}
@font-face{font-family:MR;font-weight:700;src:url(assets/manrope-b.ttf)}
*{box-sizing:border-box}html,body{margin:0;min-height:100%}
body{background:#f7f5f1 url(assets/bg.jpg) center/cover no-repeat fixed;font-family:MR,-apple-system,"Helvetica Neue",sans-serif;color:#101830;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{width:min(560px,92vw);text-align:center;padding:36px 0 40px}
.card img{height:96px;display:block;margin:0 auto}
h1{margin:26px 0 0;font:italic 600 52px/1.15 BD,Georgia,serif;background:linear-gradient(90deg,#0e1a4a,#d6222b);-webkit-background-clip:text;background-clip:text;color:transparent}
.k{margin-top:14px;font-weight:700;font-size:11px;letter-spacing:.34em;padding-left:.34em;color:rgba(14,26,74,.6)}
.rule{width:80px;height:2px;margin:24px auto 22px;background:linear-gradient(90deg,#0e1a4a,#d6222b)}
h2{margin:0;font-weight:700;font-size:20px}
.lead{margin:12px auto 0;max-width:440px;color:#606a86;line-height:1.5;font-size:15px;font-weight:500}
ul{list-style:none;margin:40px 0 0;padding:0;display:flex;justify-content:center;gap:18px}
li{width:22px;height:22px;border-radius:50%;position:relative}
li.p{border:1.6px solid #bec6d8}
li.d{background:#1a56ff}li.d::after{content:"";position:absolute;left:7px;top:4px;width:5px;height:10px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
li.c{border:2px solid rgba(26,86,255,.25);border-top-color:#1a56ff;animation:s 1s linear infinite}
li.f{background:#d6222b}li.f::before,li.f::after{content:"";position:absolute;left:10px;top:5px;width:2px;height:12px;background:#fff;transform:rotate(45deg)}li.f::after{transform:rotate(-45deg)}
@keyframes s{to{transform:rotate(360deg)}}
.cap{margin-top:22px;font-weight:700;font-size:11px;letter-spacing:.3em;padding-left:.3em;color:#1a56ff;min-height:14px}
.nm{margin-top:8px;font-weight:700;font-size:19px;min-height:26px}
.bar{height:6px;border-radius:6px;background:#dee4f0;margin:34px auto 14px;width:min(480px,86vw);overflow:hidden}.bar b{display:block;height:6px;border-radius:6px;background:linear-gradient(90deg,#1a56ff,#0e1a4a);width:${PCT}%}
.line{color:#606a86;font-size:13px;font-weight:500}
</style></head><body><div class="card">
<img src="assets/logo.png" alt="">
<h1>ASO Companion</h1>
<div class="k">AMERICAN SPACE OUJDA</div>
<div class="rule"></div>
<h2>$HEAD_T</h2>
<p class="lead">$LEAD</p>
<ul>$rows</ul>
<div class="cap">$cap</div><div class="nm">$curname</div>
<div class="bar"><b></b></div>
<div class="line">${PCT}%</div>
</div></body></html>
HTML
}
# <<< render
mark() { STATE[$1]=$2; render; }
stop() {
  local i
  for i in "${!STATE[@]}"; do [ "${STATE[$i]}" = "a" ] && STATE[$i]=f; done
  HEAD_T="Something went wrong"; LEAD="$1"; DONE=1; render
  echo
  echo "Something went wrong: $1"
  echo "The details are in the file $LOG. Send that file to the developer."
  [ "$TEST" = "1" ] && exit 1
  osascript -e "display dialog \"Something went wrong: $1\" buttons {\"OK\"} default button 1 with title \"ASO Companion setup\" with icon stop" >/dev/null 2>&1
  read -n 1 -s -r -p "Press any key to close."
  exit 1
}

clear
printf '\n  \033[1;34mASO Companion\033[0m\n'
printf '  \033[2mAmerican Space Oujda, setup on this computer\033[0m\n'
printf '  \033[2mIt takes about 5 to 10 minutes. Leave this window open.\033[0m\n'
echo
render
[ "$TEST" = "1" ] || open "$PAGE" >/dev/null 2>&1

# ---- Node.js (the Mac asks for the password once) ----
mark 0 a; PCT=3; render
if ! command -v node >/dev/null 2>&1; then
  [ "$TEST" = "1" ] && stop "Node.js is missing (test)."
  say "Installing Node.js. The Mac asks for your password once."
  JSON=$(curl -s https://nodejs.org/dist/index.json) || stop "Could not reach nodejs.org. Check the internet connection."
  VER=$(printf '%s' "$JSON" | grep -oE '"version":"v[0-9.]+"[^}]*"lts":"[A-Za-z]+"' | head -1 | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  [ -n "$VER" ] || stop "Could not find the current Node.js version."
  PKG="$WORK/aso-node.pkg"
  curl -sL -o "$PKG" "https://nodejs.org/dist/$VER/node-$VER.pkg" || stop "Could not download Node.js."
  osascript -e "do shell script \"installer -pkg $PKG -target /\" with administrator privileges" >> "$LOG" 2>&1 || stop "Node.js was not installed."
  export PATH="/usr/local/bin:$PATH"
  command -v node >/dev/null 2>&1 || stop "Node.js was not installed."
fi
mark 0 d; PCT=18; say "  Node.js is ready"

# ---- the app: it is inside this file, nothing comes from GitHub ----
mark 1 a; say "Unpacking the app..."
UPDATE=0; [ -f "$DIR/package.json" ] && UPDATE=1
mkdir -p "$DIR" "$WORK/app" || stop "The app folder could not be made."
tar -xzf "$WORK/app.tar.gz" -C "$WORK/app" >> "$LOG" 2>&1 || stop "The app could not be unpacked."
if [ "$UPDATE" = "1" ]; then
  # on an update the data, the settings and the build stay as they are
  rsync -a --exclude='/data' --exclude='/.env*' --exclude='/.aso' --exclude='/.git' --exclude='/.next' --exclude='/node_modules' --exclude='/.test-state*' --exclude='/aso.log' --exclude='/server.log' --exclude='/dev.log' "$WORK/app/" "$DIR/" >> "$LOG" 2>&1 || stop "The app could not be updated."
else
  cp -R "$WORK/app/." "$DIR/" >> "$LOG" 2>&1 || stop "The app could not be copied."
fi
mark 1 d; PCT=30; say "  app unpacked"
cd "$DIR" || stop "The app folder is missing."

mark 2 a; say "Installing the app parts (a few minutes)..."
npm install --no-audit --no-fund >> "$LOG" 2>&1 || stop "The app parts could not be installed. Check the internet connection, then open this file again."
mark 2 d; PCT=65; say "  parts installed"
mark 3 a; say "Building the app (a few minutes)..."
npx next build >> "$LOG" 2>&1 || stop "The app could not be built."
mark 3 d; PCT=88; say "  app built"

# ---- the settings: a secret of this computer and the Google keys; nobody types anything ----
mark 4 a; say "Saving the settings..."
GID=$(sed -n 's/.*"id":"\([^"]*\)".*/\1/p' "$WORK/google.json")
GSECRET=$(sed -n 's/.*"secret":"\([^"]*\)".*/\1/p' "$WORK/google.json")
[ -n "$GID" ] && [ -n "$GSECRET" ] || stop "This setup file has no Google keys. Ask for a new copy of it."
SECRET=$(grep -m1 '^ASO_SESSION_SECRET=' .env.local 2>/dev/null | cut -d= -f2-)
[ -n "$SECRET" ] || SECRET=$(LC_ALL=C tr -dc 'a-f0-9' </dev/urandom | head -c 64)
cat > .env.local <<ENV
ASO_LOCAL=1
ASO_SESSION_SECRET=$SECRET
GOOGLE_CLIENT_ID=$GID
GOOGLE_CLIENT_SECRET=$GSECRET
META_APP_ID=
META_APP_SECRET=
ENV
chmod 600 .env.local
# this install is updated from Google Drive by the app itself (the same marker the updater writes), never by git
mkdir -p .aso
tar -tzf "$WORK/app.tar.gz" | grep -v '/$' | node -e "
const fs=require('fs');const files=fs.readFileSync(0,'utf8').split('\n').map(s=>s.replace(/^\.\//,'').trim()).filter(Boolean);
let b={};try{b=JSON.parse(fs.readFileSync(process.argv[1],'utf8'))}catch(e){}
fs.writeFileSync('.aso/release.json',JSON.stringify({version:String(b.version||''),sha:String(b.sha||''),date:String(b.date||''),files}));" "$WORK/build-info.json" >> "$LOG" 2>&1 || stop "The update marker could not be written."
mark 4 d; PCT=94; say "  settings saved"

mark 5 a
# the menu-bar icon is built now too, so the first start is quick
if command -v swiftc >/dev/null 2>&1; then
  say "Preparing the menu-bar icon..."
  swiftc -O ASO-Tray.swift -o ".aso/ASO Companion" >> "$LOG" 2>&1 || say "  (the menu-bar icon was skipped)"
fi
chmod +x "ASO Companion.app/Contents/MacOS/ASO Companion" Start-ASO.command 2>/dev/null
xattr -dr com.apple.quarantine "$DIR" 2>/dev/null
[ "$TEST" = "1" ] || osascript -e "tell application \"Finder\" to make alias file to POSIX file \"$DIR/ASO Companion.app\" at desktop" >/dev/null 2>&1
mark 5 d; PCT=100; HEAD_T="You are all set"; LEAD="ASO Companion is opening. Sign in with Google in the window that appears, once. The icon is on your Desktop."; DONE=1; render
echo
say "All done. ASO Companion opens now: sign in with Google once."
echo OK > /tmp/aso-setup-result.txt
[ "$TEST" = "1" ] && exit 0
open "$DIR/ASO Companion.app"
sleep 4
exit 0
__ASO_PAYLOAD__
