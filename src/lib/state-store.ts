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

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const fileUrl = `https://api.github.com/repos/${owner}/${name}/contents/${path}`
  const encoded = Buffer.from(content, 'utf-8').toString('base64')
  let lastError = ''
  /* the file's SHA changes with every commit: if someone else saved between our read and our write, read it again and retry */
  for (let attempt = 0; attempt < 3; attempt++) {
    const metaRes = await fetch(`${fileUrl}?ref=${encodeURIComponent(branch)}`, { headers, cache: 'no-store' })
    let sha: string | undefined
    if (metaRes.ok) sha = (await metaRes.json()).sha
    else if (metaRes.status !== 404) {
      lastError = `GitHub could not be read (${metaRes.status})`
      continue
    }
    const putRes = await fetch(fileUrl, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message || `aso-companion: save state ${new Date().toISOString().slice(0, 19)}`,
        branch,
        content: encoded,
        ...(sha ? { sha } : {}),
      }),
    })
    if (putRes.ok) return { ok: true, msg: 'Saved to GitHub (fallback mode)' }
    const txt = await putRes.text()
    lastError = `GitHub API error (${putRes.status}): ${txt.slice(0, 200)}`
    if (putRes.status !== 409 && putRes.status !== 422) break
  }
  return { ok: false, msg: lastError || 'GitHub save failed' }
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

/* ---------------- posters: files next to the data, not inside it ----------------
   Poster images used to sit inside the state as base64 and made up most of what every visitor downloaded.
   They are now small WebP files, named by their content, and the state only holds the address (/api/poster/<name>).
   Same storage as the data: Vercel Blob when connected, the GitHub repo (data/posters) otherwise,
   and a local folder when neither is set up (development). */

export const POSTER_NAME = /^[a-f0-9]{16}\.webp$/

function posterGithub() {
  const repo = process.env.GITHUB_REPO || 'justkhalid/aso-companion'
  const branch = process.env.GITHUB_BRANCH || 'main'
  return { repo, branch, token: process.env.GITHUB_PAT }
}

export async function posterWrite(name: string, bytes: Buffer): Promise<{ ok: boolean; msg: string }> {
  if (!POSTER_NAME.test(name)) return { ok: false, msg: 'bad poster name' }
  try {
    if (getStorageInfo().mode === 'vercel-blob') {
      const { put } = await import('@vercel/blob')
      await put(`posters/${name}`, bytes, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'image/webp' })
      return { ok: true, msg: 'blob' }
    }
    const { repo, branch, token } = posterGithub()
    if (token) {
      const res = await fetch(`https://api.github.com/repos/${repo}/contents/data/posters/${name}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `aso-companion: poster ${name}`, branch, content: bytes.toString('base64') }),
      })
      /* 422: the file is already there (same content, same name) */
      if (res.ok || res.status === 422) return { ok: true, msg: 'github' }
      return { ok: false, msg: `GitHub poster save failed (${res.status})` }
    }
    const { mkdir, writeFile } = await import('node:fs/promises')
    await mkdir('data/posters', { recursive: true })
    await writeFile(`data/posters/${name}`, bytes)
    return { ok: true, msg: 'local' }
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : 'poster save failed' }
  }
}

const posterMemo = new Map<string, Buffer>()

export async function posterRead(name: string): Promise<Buffer | null> {
  if (!POSTER_NAME.test(name)) return null
  const hit = posterMemo.get(name)
  if (hit) return hit
  let out: Buffer | null = null
  try {
    if (getStorageInfo().mode === 'vercel-blob') {
      const { list } = await import('@vercel/blob')
      const found = (await list({ prefix: `posters/${name}`, limit: 1 })).blobs.find((b) => b.pathname === `posters/${name}`)
      if (found) {
        const r = await fetch(found.url, { cache: 'no-store' })
        if (r.ok) out = Buffer.from(await r.arrayBuffer())
      }
    } else if (posterGithub().token) {
      const { repo, branch } = posterGithub()
      const r = await fetch(`https://raw.githubusercontent.com/${repo}/${branch}/data/posters/${name}?t=${Date.now()}`, { cache: 'no-store' })
      if (r.ok) out = Buffer.from(await r.arrayBuffer())
    } else {
      const { readFile } = await import('node:fs/promises')
      out = await readFile(`data/posters/${name}`).catch(() => null)
    }
  } catch {
    out = null
  }
  if (out) {
    if (posterMemo.size >= 24) posterMemo.delete(posterMemo.keys().next().value as string)
    posterMemo.set(name, out)
  }
  return out
}

/* ---------------- one small secret file (the Meta connection, encrypted before it gets here) ----------------
   Same storage as the data: Vercel Blob when connected, the GitHub repo otherwise, and a local file in development.
   Only ciphertext is ever written; the key comes from the server secret. */

const SECRET_BLOB = 'social.enc.json'
const SECRET_PATH = 'data/social.enc.json'
let secretMemo: { at: number; text: string | null } | null = null

export async function secretRead(): Promise<string | null> {
  if (secretMemo && Date.now() - secretMemo.at < 20_000) return secretMemo.text
  let text: string | null = null
  try {
    if (getStorageInfo().mode === 'vercel-blob') {
      const { list } = await import('@vercel/blob')
      const hit = (await list({ prefix: SECRET_BLOB, limit: 1 })).blobs.find((b) => b.pathname === SECRET_BLOB)
      if (hit) {
        const r = await fetch(hit.url, { cache: 'no-store' })
        if (r.ok) text = await r.text()
      }
    } else if (process.env.GITHUB_PAT) {
      const { repo, branch, token } = posterGithub()
      const r = await fetch(`https://api.github.com/repos/${repo}/contents/${SECRET_PATH}?ref=${encodeURIComponent(branch)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        cache: 'no-store',
      })
      if (r.ok) text = Buffer.from(((await r.json()) as { content: string }).content, 'base64').toString('utf8')
    } else {
      const { readFile } = await import('node:fs/promises')
      text = await readFile(SECRET_PATH, 'utf8').catch(() => null)
    }
  } catch {
    text = null
  }
  if (text !== null && !text.trim()) text = null
  secretMemo = { at: Date.now(), text }
  return text
}

/** write the file; an empty text clears it */
export async function secretWrite(text: string): Promise<{ ok: boolean; msg: string }> {
  secretMemo = null
  try {
    if (getStorageInfo().mode === 'vercel-blob') {
      const { put } = await import('@vercel/blob')
      await put(SECRET_BLOB, text || ' ', { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' })
      return { ok: true, msg: 'blob' }
    }
    const { repo, branch, token } = posterGithub()
    if (token) {
      const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
      const url = `https://api.github.com/repos/${repo}/contents/${SECRET_PATH}`
      let last = ''
      for (let i = 0; i < 3; i++) {
        const meta = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers, cache: 'no-store' })
        const sha = meta.ok ? ((await meta.json()) as { sha: string }).sha : undefined
        const put = await fetch(url, {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'aso-companion: social connection', branch, content: Buffer.from(text || ' ').toString('base64'), ...(sha ? { sha } : {}) }),
        })
        if (put.ok) return { ok: true, msg: 'github' }
        last = `GitHub could not save it (${put.status})`
        if (put.status !== 409 && put.status !== 422) break
      }
      return { ok: false, msg: last }
    }
    const { mkdir, writeFile } = await import('node:fs/promises')
    await mkdir('data', { recursive: true })
    await writeFile(SECRET_PATH, text || ' ')
    return { ok: true, msg: 'local' }
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : 'could not save' }
  }
}

/* ---------------- small files next to the data (scheduled posts) ----------------
   Same three places as everything else: Vercel Blob when connected, the GitHub repo (data/<path>) otherwise, a local folder in development.
   Only encrypted text is written here. */

function ghFiles() {
  const { repo, branch, token } = posterGithub()
  return { repo, branch, token, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } }
}

const blobMode = () => getStorageInfo().mode === 'vercel-blob'

/** the file names (without the folder) in `data/<dir>` */
export async function fileList(dir: string): Promise<string[]> {
  try {
    if (blobMode()) {
      const { list } = await import('@vercel/blob')
      const r = await list({ prefix: dir + '/', limit: 1000 })
      return r.blobs.map((b) => b.pathname.slice(dir.length + 1))
    }
    if (process.env.GITHUB_PAT) {
      const g = ghFiles()
      const r = await fetch(`https://api.github.com/repos/${g.repo}/contents/data/${dir}?ref=${encodeURIComponent(g.branch)}`, { headers: g.headers, cache: 'no-store' })
      if (!r.ok) return []
      return ((await r.json()) as { name: string; type: string }[]).filter((f) => f.type === 'file').map((f) => f.name)
    }
    const { readdir } = await import('node:fs/promises')
    return await readdir(`data/${dir}`).catch(() => [])
  } catch {
    return []
  }
}

export async function fileRead(path: string): Promise<{ text: string; sha?: string } | null> {
  try {
    if (blobMode()) {
      const { list } = await import('@vercel/blob')
      const hit = (await list({ prefix: path, limit: 1 })).blobs.find((b) => b.pathname === path)
      if (!hit) return null
      const r = await fetch(hit.url, { cache: 'no-store' })
      return r.ok ? { text: await r.text() } : null
    }
    if (process.env.GITHUB_PAT) {
      const g = ghFiles()
      const r = await fetch(`https://api.github.com/repos/${g.repo}/contents/data/${path}?ref=${encodeURIComponent(g.branch)}`, { headers: g.headers, cache: 'no-store' })
      if (!r.ok) return null
      const j = (await r.json()) as { sha: string; content?: string; encoding?: string }
      if (j.content && j.encoding === 'base64') return { text: Buffer.from(j.content, 'base64').toString('utf8'), sha: j.sha }
      /* larger than 1 MB: the blob API gives the whole file */
      const b = await fetch(`https://api.github.com/repos/${g.repo}/git/blobs/${j.sha}`, { headers: g.headers, cache: 'no-store' })
      if (!b.ok) return null
      return { text: Buffer.from(((await b.json()) as { content: string }).content, 'base64').toString('utf8'), sha: j.sha }
    }
    const { readFile } = await import('node:fs/promises')
    const text = await readFile(`data/${path}`, 'utf8').catch(() => null)
    return text === null ? null : { text }
  } catch {
    return null
  }
}

/** write a file; with `sha` it only succeeds when the file has not changed since it was read (GitHub), which is how a post is claimed once */
export async function fileWrite(path: string, text: string, sha?: string): Promise<{ ok: boolean; msg: string; conflict?: boolean }> {
  try {
    if (blobMode()) {
      const { put } = await import('@vercel/blob')
      await put(path, text, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' })
      return { ok: true, msg: 'blob' }
    }
    if (process.env.GITHUB_PAT) {
      const g = ghFiles()
      const url = `https://api.github.com/repos/${g.repo}/contents/data/${path}`
      let cur = sha
      if (cur === undefined) {
        const m = await fetch(`${url}?ref=${encodeURIComponent(g.branch)}`, { headers: g.headers, cache: 'no-store' })
        cur = m.ok ? ((await m.json()) as { sha: string }).sha : undefined
      }
      const put = await fetch(url, {
        method: 'PUT',
        headers: { ...g.headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'aso-companion: scheduled posts', branch: g.branch, content: Buffer.from(text).toString('base64'), ...(cur ? { sha: cur } : {}) }),
      })
      if (put.ok) return { ok: true, msg: 'github' }
      return { ok: false, msg: `GitHub could not save it (${put.status})`, conflict: put.status === 409 || put.status === 422 }
    }
    const { mkdir, writeFile } = await import('node:fs/promises')
    await mkdir(`data/${path.split('/').slice(0, -1).join('/')}`, { recursive: true })
    await writeFile(`data/${path}`, text)
    return { ok: true, msg: 'local' }
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : 'could not save' }
  }
}

export async function fileDelete(path: string, sha?: string): Promise<boolean> {
  try {
    if (blobMode()) {
      const { list, del } = await import('@vercel/blob')
      const hit = (await list({ prefix: path, limit: 1 })).blobs.find((b) => b.pathname === path)
      if (hit) await del(hit.url)
      return true
    }
    if (process.env.GITHUB_PAT) {
      const g = ghFiles()
      const url = `https://api.github.com/repos/${g.repo}/contents/data/${path}`
      let cur = sha
      if (cur === undefined) {
        const m = await fetch(`${url}?ref=${encodeURIComponent(g.branch)}`, { headers: g.headers, cache: 'no-store' })
        if (!m.ok) return true
        cur = ((await m.json()) as { sha: string }).sha
      }
      const r = await fetch(url, { method: 'DELETE', headers: { ...g.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'aso-companion: scheduled posts', branch: g.branch, sha: cur }) })
      return r.ok || r.status === 404
    }
    const { rm } = await import('node:fs/promises')
    await rm(`data/${path}`, { force: true })
    return true
  } catch {
    return false
  }
}
