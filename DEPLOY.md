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

## Posting to Facebook and Instagram

Admin > Social kit > a club or event > Publish posts the poster and the story to the Facebook Page and the Instagram account. The token lives only in Vercel environment variables; the browser never sees it, and only a signed-in admin can call `/api/social/*`.

| Variable | Required | Description |
|----------|----------|-------------|
| `META_ACCESS_TOKEN` | Yes | Long-lived Page access token. |
| `META_PAGE_ID` | Yes | Facebook Page id. |
| `META_IG_USER_ID` | For Instagram | Instagram business account id linked to the Page. |
| `META_APP_ID`, `META_APP_SECRET` | No | Lets Test connection read the real token expiry. |
| `META_TOKEN_EXPIRES` | No | `YYYY-MM-DD`. The Publish tab warns 14 days before. Not needed when the two above are set. |
| `META_GRAPH_VERSION` | No | Default `v23.0`. |

Setup, once:

1. The Instagram account must be a Business or Creator account linked to the Facebook Page.
2. developers.facebook.com > My Apps > Create App (type Business). Leave it in Development mode. The person who runs the Page is an admin of the app, so posting to their own accounts needs no app review.
3. In the Graph API Explorer pick the app, then Get User Access Token with: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`.
4. Make it long-lived: `GET /oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_TOKEN`.
5. `GET /me/accounts` with the long-lived token. The Page entry holds its `id` (`META_PAGE_ID`) and its `access_token` (`META_ACCESS_TOKEN`). A Page token made this way does not expire.
6. `GET /PAGE_ID?fields=instagram_business_account` gives `META_IG_USER_ID`.
7. Add the variables in Vercel > Settings > Environment Variables and redeploy. Then Publish > Test connection.

Renewal: the Page token stops working if the person who made it changes their Facebook password or removes the app. Make a new one with steps 3 to 5 and replace `META_ACCESS_TOKEN`.

Handover: add a second admin to the Facebook Page and to the Meta app (App roles), so the setup does not depend on one person.

Notes: Instagram may refuse the 3:4 poster for feed posts; the app then retries with a 4:5 version. The link sticker on Instagram stories cannot be added through the API.

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
