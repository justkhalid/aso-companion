# ASO Companion - Deployment Guide

## Deploy to Vercel (recommended, ~5 minutes)

1. **Go to [vercel.com](https://vercel.com)** and click "Continue with GitHub".

2. **Add New Project** -> import `justkhalid/aso-companion`.

3. Framework Preset: **Next.js** (auto-detected).

4. **Add Environment Variables** (Settings -> Environment Variables):
   | Name | Value | Description |
   |------|-------|-------------|
   | `GITHUB_PAT` | `github_pat_...` | Your GitHub Personal Access Token with "repo" scope. Used by the server-side sync API. NEVER exposed to the browser. |
   | `GITHUB_REPO` | `justkhalid/aso-companion` | The repo that hosts the state file. |
   | `GITHUB_BRANCH` | `main` | The branch to save to. |
   | `GITHUB_STATE_PATH` | `data/state.json` | The path to the state file in the repo. |

5. Click **Deploy**. The site is live at `aso-companion-<name>.vercel.app` within ~30 seconds.

6. (Optional) **Add a custom domain**: Vercel -> Settings -> Domains. Free SSL, automatic HTTPS.

## How it works

- **Boot**: The app fetches the cloud state from the server-side `/api/state` proxy (which reads from `raw.githubusercontent.com`). No CORS issues, no client-side PAT exposure.
- **Load**: The "Load now" button in Settings calls the same `/api/state` proxy.
- **Save**: The "Save now" button (and auto-save) calls the server-side `/api/sync` proxy, which commits the state to GitHub using the `GITHUB_PAT` environment variable. The PAT stays server-side and is NEVER exposed to the browser.
- **Fallback**: If the server-side routes aren't available (e.g. static export), the app falls back to direct `raw.githubusercontent.com` fetches and client-side GitHub API calls (using the PAT stored in Settings -> Cloud sync).

## Local Development

```bash
# Install dependencies
bun install

# Start the dev server
bun run dev

# The app runs at http://localhost:3000

# To enable server-side sync locally, create .env.local:
cp .env.example .env.local
# Edit .env.local and add your GITHUB_PAT
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_PAT` | Yes (for save) | - | GitHub PAT for committing state changes. Fine-grained, scoped to the repo. |
| `GITHUB_REPO` | No | `justkhalid/aso-companion` | The repo that hosts the state file. |
| `GITHUB_BRANCH` | No | `main` | The branch to save to. |
| `GITHUB_STATE_PATH` | No | `data/state.json` | The path to the state file in the repo. |

## Architecture

```
Browser (client)          Vercel (server)           GitHub
  |                         |                        |
  |  GET /api/state         |                        |
  |------------------------>|  fetch raw.github.com   |
  |                         |----------------------->|
  |                         |<-----------------------|
  |<------------------------|  state JSON             |
  |                         |                        |
  |  POST /api/sync         |                        |
  |  (state JSON)            |                        |
  |------------------------>|  PUT api.github.com     |
  |                         |  (with GITHUB_PAT)      |
  |                         |----------------------->|
  |                         |<-----------------------|
  |<------------------------|  ok/err                |
```

The PAT never leaves the Vercel server. The browser only talks to `/api/state` and `/api/sync` on the same origin.
