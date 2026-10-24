# ASO Companion: notes for Claude

Admin app for the American Space Oujda (ASO). Next.js 16 + Tailwind 4 + Zustand. Owner: Khalid Chellali. He merges PRs himself.

## How Khalid wants to work
- Test and fix in a locally run copy first, then push a branch and open a PR. He only checks the result.
- Lead with the answer. No preamble, no recap, no counting items, no em dashes, straight quotes, no unicode arrows. Short plain prose. He gets confused by long or layered explanations: answer the exact question, one idea at a time.
- Never crop images he uploads. UI must be symmetric, aligned, well spaced.
- Never leave the Google app in Testing mode. The public website is not important.
- Commits end with `Co-Authored-By: Claude ... <noreply@anthropic.com>` and the `Claude-Session:` line; PR bodies end with the Claude Code line and the session URL.
- Open PRs with `gh api repos/justkhalid/aso-companion/pulls -f base=... -f head=... -f title=... -f body=...`.

## The plan (agreed)
- GitHub: only where the code is written, reviewed and versioned (him and Claude). Nothing on the director's computer talks to GitHub.
- Google (the space's account americanspaceoujda.app@gmail.com): sign-in, all data, all files, and the code releases the installed apps update from.
- The director only signs in with Google once. No keys, no tokens, no copy steps for her.
- Stages: 1 Google sign-in + Drive storage (PR #135). 2 Update channel through Drive (PR #136). 3 New installer with Google sign-in and no GitHub token (not built).

## Google details
- OAuth web client in project aso-companion-512613, consent screen External and published. Scopes: openid, email, drive.file (non-sensitive). `drive.file` means the app only sees files it created.
- Client ID and secret are never committed. Stored encrypted per computer (Settings form today) or env `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. The future installer must write them so nobody types them. Redirect URIs are localhost ones, the same on every computer.
- `src/lib/google.ts` (OAuth + Drive primitives), `src/lib/google-migrate.ts` (one-time GitHub to Drive copy, runs by itself at first sign-in), `src/lib/state-store.ts` (Drive mode when `googleActive()`), `src/components/google-panel.tsx`. Drive files are flat in the "ASO Companion" folder, `/` replaced by `__`.
- Updates: `src/lib/updates.ts`. A release is a ~5 MB source tarball plus `release__latest.json` in Drive, newest 3 kept. Installed apps download, verify sha256, copy over files (never data, `.env*`, `.aso`, `.next`, `node_modules`), delete dropped files, remove `.next/BUILD_ID` so the start file rebuilds, exit code 3 restarts. Folder `.aso/release.json` marks a Drive-updated install; start files skip `git pull` then.
- Publishing: only on Khalid's computer with `ASO_PUBLISH=1`: Settings > Updates > Publish update takes newest main from GitHub into Drive. No secrets in GitHub (he rejected a GitHub key on purpose).
- Open problem for stage 3: a brand-new computer cannot download from Drive before it signs in. Options: installer carries the app (~5 MB, private) or a public link. Recommended: installer carries the app.

## Not yet done or not yet verified
- Real Google, Windows and Mac have not been tested; everything was tested against a fake Google.
- Stage 3 installer. Second Owner on the Google Cloud project. Khalid to check privacy/terms wording (PR #134).
- Documents section (planned): templates the space needs, print-ready A4 PDF with editable fields, brand colors, QR codes from the saved social links. First: social QR poster, volunteers/interns poster, report template, certificate. Undecided: English only or English + Arabic + French.
- Postponed: member card photo crop, calendar story video, large file split, Arabic alignment.

## Installer style
Flat pale-lavender style (commit 0ac50a4 base), title in Playfair Display 800, solid navy. Windows: .bat with embedded PowerShell/WinForms. Mac: .command with a generated HTML progress page.

## Local test recipe
- Dev server: `ASO_LOCAL=1 ASO_SESSION_SECRET=testsecret1234567890 ASO_STATE_FILE=<test state json> npx next dev -p 3200`. Add `NEXT_FONT_GOOGLE_MOCKED_RESPONSES=<mock file>` when the sandbox cannot reach Google Fonts, and `rm -rf .next/dev` after env changes.
- Fake Google for tests: override `GOOGLE_AUTH_URL`, `GOOGLE_TOKEN_URL`, `GOOGLE_API_BASE`, `GOOGLE_USERINFO_URL`; `GITHUB_API_BASE` for the GitHub copy.
- Log in for API calls: `POST /api/login {"code":"1234","role":"admin"}`.
- Never `pkill -f` or `pgrep -f` with a pattern that appears in your own command line; it kills the shell. Wait a few seconds after killing a dev server before starting another on the same port.
- `src/app/api/...` routes: admin only via `isAdmin(req)`, local-only via `isLocal()`.
