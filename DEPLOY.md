# ASO Companion - Deployment Guide

## Deploy to Vercel (recommended, ~5 minutes)

1. **Go to [vercel.com](https://vercel.com)** and click "Continue with GitHub".

2. **Add New Project** -> import `justkhalid/aso-companion`.

3. Framework Preset: **Next.js** (auto-detected).

4. **Connect Vercel Blob** (the data store):
   - In the project: **Storage -> Create Database -> Blob**.
   - Connect it to the `aso-companion` project. Vercel adds the
     `BLOB_READ_WRITE_TOKEN` environment variable automatically.
   - Redeploy once after connecting. Done: all app data now lives on Vercel.
   - On the first load after migration, the Blob store seeds itself from the
     existing `data/state.json` copy in the repo, so nothing is lost.

5. (Legacy only) If you do NOT connect Blob, the app still works using the
   old GitHub mechanism. Then you need:
   | Name | Value | Description |
   |------|-------|-------------|
   | `ASO_SESSION_SECRET` | Strongly recommended | derived from `BLOB_READ_WRITE_TOKEN` / `GITHUB_PAT` if set; fixed dev value outside production; random per process otherwise | Long random string (for example `openssl rand -hex 32`) used to sign the admin session cookie issued by `POST /api/login`. `POST /api/sync` returns 401 without that cookie, and `/api/state` hides `adminCode` / `teacherCode` from visitors. Changing it signs every admin out. |
| `GITHUB_PAT` | `github_pat_...` | GitHub Personal Access Token with "repo" scope, used by the fallback sync. Server-side only, never exposed to the browser. |
   | `GITHUB_REPO` | `justkhalid/aso-companion` | The repo that hosts the state file. |
   | `GITHUB_BRANCH` | `main` | The branch to save to. |
   | `GITHUB_STATE_PATH` | `data/state.json` | The path to the state file in the repo. |

6. Click **Deploy**. The site is live at `aso-companion-<name>.vercel.app` within ~30 seconds.

7. (Optional) **Add a custom domain**: Vercel -> Settings -> Domains. Free SSL, automatic HTTPS.

## How it works (v4.6)

- **Single source of truth**: `/api/state` (read) and `/api/sync` (write) resolve the
  storage provider on the server. The browser only ever talks to these two routes on
  the same origin. It never talks to GitHub directly.
- **Primary storage - Vercel Blob**: one JSON file (`aso-state.json`) in the project's
  Blob store. Admin saves are instant, create NO git commits, and trigger NO redeploys.
  The Settings page shows a green "Vercel Blob (Vercel-native)" badge when active.
- **Legacy fallback - GitHub**: while Blob is not connected, saves commit
  `data/state.json` to the repo (needs `GITHUB_PAT`). The Settings page shows an amber
  "GitHub fallback" badge in this mode.
- **Bootstrap**: the `data/state.json` file in the repo is only a seed. It is read once
  to fill an empty Blob store after migration; after that it stays untouched.
- **Convergence**: on boot the app merges local and cloud state by revision (`_rev`).
  If a device was strictly newer (offline edit), it pushes its copy up automatically,
  so devices converge instead of drifting apart.

## GitHub is code-only

- **GitHub Pages has been removed.** The old site at
  `justkhalid.github.io/aso-companion` is gone. Do not re-enable it:
  this repo deploys to Vercel only.
- Admin data saves no longer appear as commits in the repository once
  Vercel Blob is connected. Commits in the repo = code changes only.

## Local Development

```bash
# Install dependencies
bun install

# Start the dev server
bun run dev

# The app runs at http://localhost:3000

# Without env vars, /api/state falls back to reading the public GitHub copy
# (read-only). To test writes locally, add GITHUB_PAT or BLOB_READ_WRITE_TOKEN
# in .env.local (see .env.example).
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BLOB_READ_WRITE_TOKEN` | Recommended | - | Vercel Blob store token. Added automatically when you connect a Blob store. Enables Vercel-native storage. |
| `GITHUB_PAT` | Legacy fallback | - | GitHub PAT used only while Blob is not connected. |
| `GITHUB_REPO` | No | `justkhalid/aso-companion` | The repo hosting the fallback state file. |
| `GITHUB_BRANCH` | No | `main` | The fallback branch. |
| `GITHUB_STATE_PATH` | No | `data/state.json` | The fallback state file path. |

## Architecture

```
Browser (client)            Vercel (server)                Storage
  |                           |                              |
  |  GET /api/state           |   Vercel Blob connected?     |
  |-------------------------->|   yes: read aso-state.json ->| Blob (instant)
  |<--------------------------|   no : fetch raw state  ---->| GitHub (legacy)
  |                           |                              |
  |  POST /api/sync           |                              |
  |  (state JSON)             |   yes: put aso-state.json -->| Blob  (no commit,
  |-------------------------->|   no : PUT contents API ---->| GitHub  no deploy)
  |<--------------------------|                              |
```

Writes need the admin session: `POST /api/login` checks the admin code on the server and sets a signed HttpOnly cookie; `POST /api/sync` rejects requests without it (401). `GET /api/state` removes `adminCode` and `teacherCode` unless the cookie is present.

The PAT and Blob token never leave the Vercel server. The browser only talks to
`/api/state` and `/api/sync` on the same origin.

## Diagnostic endpoints

- `GET /api/storage-status`: which provider is active, whether Blob/PAT are configured.
- `GET /api/state`: response header `X-ASO-Storage` shows the source of that read
  (`vercel-blob`, `seeded-from-github`, `github`).
