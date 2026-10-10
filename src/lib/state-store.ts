/**
 * ASO Companion - unified cloud state storage (server-side only).
 *
 * Architecture (v4.6):
 *   PRIMARY   : Vercel Blob (a single JSON file, `aso-state.json`).
 *               Fully Vercel-native: admin saves are instant, never create
 *               git commits, and never trigger redeploys.
 *   FALLBACK  : GitHub `data/state.json` (the legacy mechanism). Used only
 *               while `BLOB_READ_WRITE_TOKEN` is not configured on Vercel,
 *               so the site keeps working during migration.
 *   BOOTSTRAP : the repo copy of `data/state.json` seeds the Blob store on
 *               first read after Blob is connected (zero-touch migration).
 *
 * GitHub therefore becomes CODE-ONLY: no data commits, no Pages site.
 */

export type StorageMode = 'vercel-blob' | 'github-fallback'

export interface StorageInfo {
  mode: StorageMode
  blobConfigured: boolean
  patConfigured: boolean
  label: string
  detail: string
}

export interface ReadResult {
  ok: boolean
  state: unknown | null
  source: 'vercel-blob' | 'github' | 'seeded-from-github' | 'none'
  error?: string
}

const BLOB_PATHNAME = 'aso-state.json'

export function getStorageInfo(): StorageInfo {
  const blobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN
  const patConfigured = !!process.env.GITHUB_PAT
  const mode: StorageMode = blobConfigured ? 'vercel-blob' : 'github-fallback'
  return {
    mode,
    blobConfigured,
    patConfigured,
    label:
      mode === 'vercel-blob'
        ? 'Vercel Blob (Vercel-native)'
        : 'GitHub fallback (legacy)',
    detail:
      mode === 'vercel-blob'
        ? 'Data lives on Vercel. Saves are instant and never touch GitHub.'
        : 'Connect a Vercel Blob store in the Vercel dashboard to go fully Vercel-native. Until then saves are committed to the GitHub repo.',
  }
}

/* ---------------- Vercel Blob helpers ---------------- */

async function blobFindUrl(): Promise<string | null> {
  const { list } = await import('@vercel/blob')
  const res = await list({ prefix: BLOB_PATHNAME, limit: 1 })
  const hit = res.blobs.find((b) => b.pathname === BLOB_PATHNAME)
  return hit ? hit.url : null
}

async function blobRead(): Promise<unknown | null> {
  const url = await blobFindUrl()
  if (!url) return null
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

async function blobWrite(content: string): Promise<void> {
  const { put } = await import('@vercel/blob')
  await put(BLOB_PATHNAME, content, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  })
}

/* ---------------- GitHub fallback helpers ---------------- */

function githubRawUrl(): string {
  const repo = process.env.GITHUB_REPO || 'justkhalid/aso-companion'
  const branch = process.env.GITHUB_BRANCH || 'main'
  const path = process.env.GITHUB_STATE_PATH || 'data/state.json'
  return `https://raw.githubusercontent.com/${repo}/${branch}/${path}`
}

async function githubRead(): Promise<unknown | null> {
  const res = await fetch(`${githubRawUrl()}?t=${Date.now()}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  try {
    return await res.json()
  } catch {
    return null
  }
}

async function githubWrite(
  content: string,
  message?: string,
): Promise<{ ok: boolean; msg: string }> {
  const token = process.env.GITHUB_PAT
  const repo = process.env.GITHUB_REPO || 'justkhalid/aso-companion'
  const branch = process.env.GITHUB_BRANCH || 'main'
  const path = process.env.GITHUB_STATE_PATH || 'data/state.json'

  if (!token) {
    return {
      ok: false,
      msg: 'No storage configured: set BLOB_READ_WRITE_TOKEN (Vercel Blob) or GITHUB_PAT (GitHub fallback) in Vercel environment variables.',
    }
  }

  const [owner, name] = repo.split('/')
  if (!owner || !name) return { ok: false, msg: 'Invalid GITHUB_REPO format (expected owner/name)' }

  /* get current file SHA (if any) so the PUT can update it */
  const metaUrl = `https://api.github.com/repos/${owner}/${name}/contents/${path}?ref=${encodeURIComponent(branch)}`
  const metaRes = await fetch(metaUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  let sha: string | undefined
  if (metaRes.ok) sha = (await metaRes.json()).sha

  const encoded = Buffer.from(content, 'utf-8').toString('base64')
  const putRes = await fetch(
    `https://api.github.com/repos/${owner}/${name}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message:
          message ||
          `aso-companion: save state ${new Date().toISOString().slice(0, 19)}`,
        branch,
        content: encoded,
        ...(sha ? { sha } : {}),
      }),
    },
  )
  if (!putRes.ok) {
    const txt = await putRes.text()
    return { ok: false, msg: `GitHub API error: ${txt.slice(0, 200)}` }
  }
  return { ok: true, msg: 'Saved to GitHub (fallback mode)' }
}

/* ---------------- public API ---------------- */

function isState(x: unknown): x is { v: number } {
  return !!x && typeof x === 'object' && (x as { v?: number }).v === 1
}

/**
 * Read the live state. Blob first; if Blob is configured but still empty
 * (first run after migration), seed it from the GitHub copy automatically.
 */
const MEMO_MS = 15_000
let memo: { at: number; res: ReadResult } | null = null

export async function readCloudState(opts?: { fresh?: boolean }): Promise<ReadResult> {
  /* a burst of visitors reuses one read instead of hitting Blob or GitHub each time */
  if (!opts?.fresh && memo && Date.now() - memo.at < MEMO_MS) return memo.res
  const res = await readCloudStateUncached()
  if (res.ok) memo = { at: Date.now(), res }
  return res
}

async function readCloudStateUncached(): Promise<ReadResult> {
  const info = getStorageInfo()

  if (info.mode === 'vercel-blob') {
    try {
      const fromBlob = await blobRead()
      if (isState(fromBlob)) {
        return { ok: true, state: fromBlob, source: 'vercel-blob' }
      }
      /* Blob is empty: one-time seed from the GitHub copy */
      const fromGithub = await githubRead()
      if (isState(fromGithub)) {
        try {
          await blobWrite(JSON.stringify(fromGithub))
          return { ok: true, state: fromGithub, source: 'seeded-from-github' }
        } catch {
          /* seeding failed: still serve the GitHub copy so the app works */
          return { ok: true, state: fromGithub, source: 'github' }
        }
      }
      return { ok: false, state: null, source: 'none', error: 'Blob store is empty and no GitHub seed found' }
    } catch (e) {
      return {
        ok: false,
        state: null,
        source: 'none',
        error: e instanceof Error ? e.message : 'Blob read failed',
      }
    }
  }

  /* legacy GitHub fallback */
  try {
    const state = await githubRead()
    if (isState(state)) return { ok: true, state, source: 'github' }
    return { ok: false, state: null, source: 'none', error: 'No state found in the GitHub repo' }
  } catch (e) {
    return {
      ok: false,
      state: null,
      source: 'none',
      error: e instanceof Error ? e.message : 'GitHub read failed',
    }
  }
}

/** Write the live state. Blob overwrite (no git commit) or GitHub fallback. */
export async function writeCloudState(
  content: string,
  message?: string,
): Promise<{ ok: boolean; msg: string; mode: StorageMode }> {
  memo = null /* the next read must see this save */
  const info = getStorageInfo()

  if (info.mode === 'vercel-blob') {
    try {
      await blobWrite(content)
      return { ok: true, msg: 'Saved to Vercel', mode: 'vercel-blob' }
    } catch (e) {
      return {
        ok: false,
        msg: e instanceof Error ? e.message : 'Vercel Blob write failed',
        mode: 'vercel-blob',
      }
    }
  }

  const r = await githubWrite(content, message)
  return { ...r, mode: 'github-fallback' }
}
