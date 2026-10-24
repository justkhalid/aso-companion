/* The space's Google account (server only, the director's computer only).
   The team signs in once with the space's Google account. The app asks for two things only: the account's email address and
   access to the files it creates itself in Google Drive (the non-sensitive "drive.file" permission). The data then lives in a
   Drive folder called "ASO Companion". The refresh key of this computer is kept encrypted in data/google.enc.json.
   Files are flat in the folder; a path like posters/ab.webp is stored under the name posters__ab.webp. */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { derivedKey } from './auth'
import { isLocal } from './mode'

const FILE = 'data/google.enc.json'
export const FOLDER_NAME = 'ASO Companion'
export const SCOPES = 'openid email https://www.googleapis.com/auth/drive.file'
const FOLDER_MIME = 'application/vnd.google-apps.folder'

/* the addresses can be pointed at a test server (used only when testing the app here) */
const urls = () => ({
  auth: process.env.GOOGLE_AUTH_URL || 'https://accounts.google.com/o/oauth2/v2/auth',
  token: process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token',
  api: process.env.GOOGLE_API_BASE || 'https://www.googleapis.com',
  info: process.env.GOOGLE_USERINFO_URL || 'https://openidconnect.googleapis.com/v1/userinfo',
})

/* the Client ID and secret of the space's Google project: from the environment (the installer writes them), else saved encrypted on this computer from Settings */
const CLIENT_FILE = 'data/google-client.enc.json'
interface ClientKeys { id: string; secret: string }
function sealAny(v: unknown, purpose: string): string {
  const iv = randomBytes(12)
  const k = createCipheriv('aes-256-gcm', derivedKey(purpose), iv)
  const data = Buffer.concat([k.update(JSON.stringify(v), 'utf8'), k.final()])
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: k.getAuthTag().toString('base64'), data: data.toString('base64') })
}
function unsealAny<T>(text: string, purpose: string): T | null {
  try {
    const j = JSON.parse(text) as { iv: string; tag: string; data: string }
    const d = createDecipheriv('aes-256-gcm', derivedKey(purpose), Buffer.from(j.iv, 'base64'))
    d.setAuthTag(Buffer.from(j.tag, 'base64'))
    return JSON.parse(Buffer.concat([d.update(Buffer.from(j.data, 'base64')), d.final()]).toString('utf8')) as T
  } catch {
    return null
  }
}
let clientMemo: { at: number; k: ClientKeys | null } | null = null
function clientKeys(): ClientKeys | null {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) return { id: process.env.GOOGLE_CLIENT_ID, secret: process.env.GOOGLE_CLIENT_SECRET }
  if (!isLocal()) return null
  if (clientMemo && Date.now() - clientMemo.at < 5000) return clientMemo.k
  let k: ClientKeys | null = null
  try { k = existsSync(CLIENT_FILE) ? unsealAny<ClientKeys>(readFileSync(CLIENT_FILE, 'utf8'), 'google-client') : null } catch { k = null }
  clientMemo = { at: Date.now(), k }
  return k
}
export const googleConfigured = () => !!clientKeys()
export function saveClientKeys(id: string, secret: string): { ok: boolean; msg: string } {
  const i = id.trim(), x = secret.trim()
  if (!/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(i)) return { ok: false, msg: 'The Client ID looks wrong. It ends with .apps.googleusercontent.com.' }
  if (x.length < 10 || /\s/.test(x)) return { ok: false, msg: 'The Client secret looks wrong.' }
  mkdirSync('data', { recursive: true })
  writeFileSync(CLIENT_FILE, sealAny({ id: i, secret: x }, 'google-client'))
  clientMemo = { at: Date.now(), k: { id: i, secret: x } }
  return { ok: true, msg: 'Saved' }
}

export interface GoogleConn { refresh: string; email: string; folderId: string; savedAt: string }

function seal(c: GoogleConn): string {
  const iv = randomBytes(12)
  const k = createCipheriv('aes-256-gcm', derivedKey('google'), iv)
  const data = Buffer.concat([k.update(JSON.stringify(c), 'utf8'), k.final()])
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: k.getAuthTag().toString('base64'), data: data.toString('base64') })
}
function unseal(text: string): GoogleConn | null {
  try {
    const j = JSON.parse(text) as { iv: string; tag: string; data: string }
    const d = createDecipheriv('aes-256-gcm', derivedKey('google'), Buffer.from(j.iv, 'base64'))
    d.setAuthTag(Buffer.from(j.tag, 'base64'))
    return JSON.parse(Buffer.concat([d.update(Buffer.from(j.data, 'base64')), d.final()]).toString('utf8')) as GoogleConn
  } catch {
    return null
  }
}

let connMemo: { at: number; c: GoogleConn | null } | null = null
export function googleConn(): GoogleConn | null {
  if (!isLocal()) return null
  if (connMemo && Date.now() - connMemo.at < 5000) return connMemo.c
  let c: GoogleConn | null = null
  try { c = existsSync(FILE) ? unseal(readFileSync(FILE, 'utf8')) : null } catch { c = null }
  connMemo = { at: Date.now(), c }
  return c
}
function saveConn(c: GoogleConn) {
  mkdirSync('data', { recursive: true })
  writeFileSync(FILE, seal(c))
  connMemo = { at: Date.now(), c }
}
/** true when this computer is signed in and the app should keep its data in Drive */
export const googleActive = () => googleConfigured() && !!googleConn()

export function disconnectGoogle() {
  try { rmSync(FILE, { force: true }) } catch { /* nothing to remove */ }
  connMemo = null
  tok = null
  index = null
}

/* ---------------- sign-in ---------------- */

export function authUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: clientKeys()?.id || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `${urls().auth}?${p}`
}

async function tokenCall(body: Record<string, string>): Promise<{ ok: boolean; j: Record<string, unknown> }> {
  const r = await fetch(urls().token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientKeys()?.id || '', client_secret: clientKeys()?.secret || '', ...body }),
  })
  return { ok: r.ok, j: (await r.json().catch(() => ({}))) as Record<string, unknown> }
}

/** finish the sign-in: trade the code for a refresh key, find or create the folder, remember all of it */
export async function completeSignIn(code: string, redirectUri: string): Promise<{ ok: boolean; msg: string; email?: string }> {
  if (!googleConfigured()) return { ok: false, msg: 'Google sign-in is not set up in this copy of the app.' }
  const t = await tokenCall({ code, redirect_uri: redirectUri, grant_type: 'authorization_code' })
  const access = t.j.access_token as string | undefined
  const refresh = t.j.refresh_token as string | undefined
  if (!t.ok || !access) return { ok: false, msg: `Google did not accept the sign-in (${String(t.j.error || 'error')}).` }
  if (!refresh) return { ok: false, msg: 'Google gave no lasting access. Remove ASO Companion in the Google account\'s security settings and sign in again.' }
  if (!String(t.j.scope || '').includes('drive.file')) return { ok: false, msg: 'The Drive permission was not ticked. Sign in again and keep it ticked.' }
  tok = { value: access, exp: Date.now() + (Number(t.j.expires_in) || 3000) * 1000 - 60_000 }
  const ui = await fetch(urls().info, { headers: { Authorization: `Bearer ${access}` } }).then((r) => r.json()).catch(() => ({})) as { email?: string }
  const conn: GoogleConn = { refresh, email: ui.email || '', folderId: '', savedAt: new Date().toISOString() }
  saveConn(conn)
  index = null
  try {
    conn.folderId = await ensureFolder()
    saveConn(conn)
  } catch (e) {
    disconnectGoogle()
    return { ok: false, msg: e instanceof Error ? e.message : 'The Drive folder could not be made.' }
  }
  return { ok: true, msg: 'Connected', email: conn.email }
}

/* ---------------- access ---------------- */

let tok: { value: string; exp: number } | null = null

async function accessToken(force = false): Promise<string> {
  if (!force && tok && tok.exp > Date.now()) return tok.value
  const c = googleConn()
  if (!c) throw new Error('Google is not connected on this computer.')
  const t = await tokenCall({ refresh_token: c.refresh, grant_type: 'refresh_token' })
  const v = t.j.access_token as string | undefined
  if (!t.ok || !v) {
    if (t.j.error === 'invalid_grant') throw new Error('Google sign-in has expired. Sign in again in Settings.')
    throw new Error(`Google could not be reached (${String(t.j.error || 'error')}).`)
  }
  tok = { value: v, exp: Date.now() + (Number(t.j.expires_in) || 3000) * 1000 - 60_000 }
  return v
}

async function gfetch(url: string, init: RequestInit = {}): Promise<Response> {
  let last: Response | null = null
  for (let i = 0; i < 3; i++) {
    const token = await accessToken(i === 1)
    const r = await fetch(url, { ...init, headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` }, cache: 'no-store' })
    if (r.status === 401 && i === 0) { last = r; continue }
    if ((r.status === 429 || r.status >= 500) && i < 2) { last = r; await new Promise((ok) => setTimeout(ok, 600 * (i + 1))); continue }
    return r
  }
  return last as Response
}

/* ---------------- the Drive folder ---------------- */

const api = () => `${urls().api}/drive/v3/files`
const upload = () => `${urls().api}/upload/drive/v3/files`

async function ensureFolder(): Promise<string> {
  const q = encodeURIComponent(`mimeType='${FOLDER_MIME}' and name='${FOLDER_NAME}' and trashed=false`)
  const r = await gfetch(`${api()}?q=${q}&fields=files(id,name)&pageSize=10`)
  if (!r.ok) throw new Error(`Drive could not be read (${r.status}).`)
  const hit = ((await r.json()) as { files?: { id: string }[] }).files?.[0]
  if (hit) return hit.id
  const c = await gfetch(api(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME }) })
  if (!c.ok) throw new Error(`The Drive folder could not be made (${c.status}).`)
  return ((await c.json()) as { id: string }).id
}

async function folder(): Promise<string> {
  const c = googleConn()
  if (!c) throw new Error('Google is not connected on this computer.')
  if (c.folderId) return c.folderId
  c.folderId = await ensureFolder()
  saveConn(c)
  return c.folderId
}

export interface DriveFile { id: string; name: string; version: string; size: number }
let index: { at: number; byName: Map<string, DriveFile> } | null = null

/** every file in the folder, by name (kept for a few seconds) */
async function listAll(fresh = false): Promise<Map<string, DriveFile>> {
  if (!fresh && index && Date.now() - index.at < 8000) return index.byName
  const f = await folder()
  const byName = new Map<string, DriveFile>()
  let page = ''
  do {
    const q = encodeURIComponent(`'${f}' in parents and trashed=false`)
    const r = await gfetch(`${api()}?q=${q}&fields=nextPageToken,files(id,name,version,size)&pageSize=1000${page ? `&pageToken=${encodeURIComponent(page)}` : ''}`)
    if (!r.ok) throw new Error(`Drive could not be read (${r.status}).`)
    const j = (await r.json()) as { nextPageToken?: string; files?: { id: string; name: string; version?: string; size?: string }[] }
    for (const x of j.files || []) if (!byName.has(x.name)) byName.set(x.name, { id: x.id, name: x.name, version: x.version || '', size: Number(x.size) || 0 })
    page = j.nextPageToken || ''
  } while (page)
  index = { at: Date.now(), byName }
  return byName
}

export const driveName = (path: string) => path.replace(/\//g, '__')

export async function driveHas(name: string): Promise<DriveFile | null> {
  return (await listAll()).get(name) || null
}

export async function driveNames(prefix: string): Promise<string[]> {
  return [...(await listAll(true)).keys()].filter((n) => n.startsWith(prefix))
}

export async function driveGet(name: string): Promise<{ bytes: Buffer; version: string } | null> {
  const meta = (await listAll()).get(name) || (await listAll(true)).get(name)
  if (!meta) return null
  const r = await gfetch(`${api()}/${meta.id}?alt=media`)
  if (r.status === 404) { index = null; return null }
  if (!r.ok) throw new Error(`Drive could not be read (${r.status}).`)
  /* the version of the bytes we hold, so a claim can tell whether the file changed since */
  const v = await gfetch(`${api()}/${meta.id}?fields=version`).then((x) => x.json()).catch(() => ({})) as { version?: string }
  return { bytes: Buffer.from(await r.arrayBuffer()), version: v.version || meta.version }
}

/** write a file; with `ifVersion` it only succeeds when the file is still at that version */
export async function drivePut(name: string, data: Buffer | string, mime = 'application/json', ifVersion?: string): Promise<{ ok: boolean; msg: string; conflict?: boolean }> {
  const bytes = typeof data === 'string' ? Buffer.from(data, 'utf8') : data
  const all = await listAll(ifVersion !== undefined)
  const have = all.get(name)
  if (have) {
    if (ifVersion !== undefined) {
      const m = await gfetch(`${api()}/${have.id}?fields=version`)
      if (m.ok && ((await m.json()) as { version?: string }).version !== ifVersion) return { ok: false, msg: 'The file changed in the meantime.', conflict: true }
    }
    const r = await gfetch(`${upload()}/${have.id}?uploadType=media&fields=id,version`, { method: 'PATCH', headers: { 'Content-Type': mime }, body: new Uint8Array(bytes) })
    index = null
    return r.ok ? { ok: true, msg: 'drive' } : { ok: false, msg: `Drive could not save it (${r.status}).` }
  }
  const boundary = 'aso' + randomBytes(8).toString('hex')
  const meta = JSON.stringify({ name, parents: [await folder()] })
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`),
    bytes,
    Buffer.from(`\r\n--${boundary}--`),
  ])
  const r = await gfetch(`${upload()}?uploadType=multipart&fields=id,version`, { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: new Uint8Array(body) })
  index = null
  return r.ok ? { ok: true, msg: 'drive' } : { ok: false, msg: `Drive could not save it (${r.status}).` }
}

export async function driveDelete(name: string): Promise<boolean> {
  const have = (await listAll(true)).get(name)
  if (!have) return true
  const r = await gfetch(`${api()}/${have.id}`, { method: 'DELETE' })
  index = null
  return r.ok || r.status === 404
}

/** a short summary for the Settings page */
export async function googleStatus(): Promise<{ configured: boolean; connected: boolean; email: string; files: number; error?: string }> {
  const c = googleConn()
  const base = { configured: googleConfigured(), connected: !!c, email: c?.email || '', files: 0 }
  if (!c || !base.configured) return base
  try {
    return { ...base, files: (await listAll(true)).size }
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : 'Drive could not be reached.' }
  }
}
