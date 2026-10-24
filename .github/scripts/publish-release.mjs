#!/usr/bin/env node
/* Puts a new release of the app into the space's Google Drive folder "ASO Companion", where the installed apps look for updates.
   Runs from GitHub Actions after a merge (and can be run by hand). It needs the same Google keys the app uses:
     GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN  (the "publishing key" from Settings > Google account)
   It uploads release__<version>.tar.gz and release__latest.json, then keeps only the newest KEEP releases so Drive never fills up. */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const KEEP = 3
const FOLDER = 'ASO Companion'
const TOKEN_URL = process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token'
const API = process.env.GOOGLE_API_BASE || 'https://www.googleapis.com'
const { GOOGLE_CLIENT_ID: cid, GOOGLE_CLIENT_SECRET: sec, GOOGLE_REFRESH_TOKEN: rt } = process.env
if (!cid || !sec || !rt) { console.error('Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET or GOOGLE_REFRESH_TOKEN.'); process.exit(1) }

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 28 }).trim()
const EXCLUDE = ['--', '.', ':!data', ':!.github', ':!handoff']

let access = ''
async function token() {
  const r = await fetch(TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: cid, client_secret: sec, refresh_token: rt, grant_type: 'refresh_token' }) })
  if (!r.ok) throw new Error('Google refused the publishing key (' + r.status + '). Make a new one in Settings > Google account.')
  access = (await r.json()).access_token
}
async function g(url, init = {}) {
  const r = await fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: 'Bearer ' + access } })
  if (!r.ok) throw new Error(`Drive ${init.method || 'GET'} ${url.replace(API, '')} -> ${r.status} ${(await r.text()).slice(0, 200)}`)
  return r
}
const q = (s) => encodeURIComponent(s)
async function list(query) {
  const r = await g(`${API}/drive/v3/files?q=${q(query)}&fields=${q('files(id,name)')}&pageSize=1000`)
  return (await r.json()).files || []
}
async function upload(folderId, existing, name, bytes, mime) {
  if (existing) { await g(`${API}/upload/drive/v3/files/${existing.id}?uploadType=media`, { method: 'PATCH', headers: { 'content-type': mime }, body: bytes }); return }
  const b = 'aso' + Math.random().toString(36).slice(2)
  const head = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [folderId] })}\r\n--${b}\r\nContent-Type: ${mime}\r\n\r\n`
  await g(`${API}/upload/drive/v3/files?uploadType=multipart`, { method: 'POST', headers: { 'content-type': `multipart/related; boundary=${b}` }, body: Buffer.concat([Buffer.from(head), bytes, Buffer.from(`\r\n--${b}--`)]) })
}

/* what changed: commit titles since the last release, without data saves and version bookkeeping */
function changesSince(prev) {
  const raw = git('log', '-n', '60', '--format=%H%x1f%cI%x1f%B%x1e', prev && /^[0-9a-f]{40}$/.test(prev) ? `${prev}..HEAD` : 'HEAD')
  const out = []
  for (const c of raw.split('\x1e')) {
    const [sha, date, msg] = c.trim().split('\x1f')
    if (!sha || !msg) continue
    const [first, ...rest] = msg.split('\n')
    if (/^aso-companion:/i.test(first) || /^chore\(version\)/i.test(first) || /^Merge (origin|remote-tracking|branch)/i.test(first)) continue
    const lines = rest.map((l) => l.trim()).filter(Boolean)
    const isPr = /^Merge pull request/i.test(first)
    out.push({ sha: sha.slice(0, 7), date, title: isPr ? lines[0] || first : first, note: isPr ? '' : lines.filter((l) => !/^(Co-Authored-By|Claude-Session)/i.test(l)).slice(0, 4).join('\n') })
  }
  return out
}

async function main() {
  await token()
  const folders = await list(`name='${FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)
  if (!folders.length) throw new Error(`The folder "${FOLDER}" was not found. Sign in with Google once in the app so it is created, and use that same Google account for the publishing key.`)
  const folderId = folders[0].id
  const files = await list(`'${folderId}' in parents and trashed=false`)
  const byName = (n) => files.find((f) => f.name === n)

  const version = JSON.parse(readFileSync('package.json', 'utf8')).version
  const sha = git('rev-parse', 'HEAD')
  const date = git('log', '-1', '--format=%cI')

  let prev = null
  const lm = byName('release__latest.json')
  if (lm) { try { prev = await (await g(`${API}/drive/v3/files/${lm.id}?alt=media`)).json() } catch { prev = null } }
  if (prev && prev.sha === sha) { console.log('Release for this commit is already in Drive:', prev.version); return }

  const dir = mkdtempSync(path.join(tmpdir(), 'aso-rel-'))
  const tgz = path.join(dir, 'release.tar.gz')
  git('archive', '--format=tar.gz', '-o', tgz, 'HEAD', ...EXCLUDE)
  const bytes = readFileSync(tgz)
  rmSync(dir, { recursive: true, force: true })
  const fileList = git('ls-files', ...EXCLUDE).split('\n').filter(Boolean)

  const name = `release__${version}.tar.gz`
  await upload(folderId, byName(name), name, bytes, 'application/gzip')
  const log = [...changesSince(prev && prev.sha), ...((prev && prev.log) || [])].slice(0, 40)
  const manifest = { version, sha, date, file: name, sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length, files: fileList, log }
  await upload(folderId, byName('release__latest.json'), 'release__latest.json', Buffer.from(JSON.stringify(manifest)), 'application/json')

  /* keep only the newest releases */
  const vkey = (n) => (n.match(/^release__(\d+)\.(\d+)\.(\d+)\.tar\.gz$/) || []).slice(1).map(Number)
  const old = files.filter((f) => vkey(f.name).length === 3 && f.name !== name).sort((a, b) => { const x = vkey(a.name), y = vkey(b.name); return y[0] - x[0] || y[1] - x[1] || y[2] - x[2] })
  for (const f of old.slice(KEEP - 1)) { await g(`${API}/drive/v3/files/${f.id}`, { method: 'DELETE' }); console.log('Removed old release', f.name) }
  console.log(`Published ${name} (${(bytes.length / 1048576).toFixed(1)} MB, ${fileList.length} files)`)
}
main().catch((e) => { console.error(String(e.message || e)); process.exit(1) })
