/* Version information and the in-app updater (server only). The installed version is the git commit of the folder the app runs from;
   the latest is the main branch of the GitHub repository. Updating pulls the new code; the start file then rebuilds and restarts. */
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { isLocal } from './mode'
import { driveGet, googleActive } from './google'

const run = (cmd: string, args: string[], noShell = false) =>
  new Promise<{ ok: boolean; out: string }>((resolve) => {
    execFile(cmd, args, { cwd: process.cwd(), timeout: 120_000, windowsHide: true, shell: !noShell && process.platform === 'win32', env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' } }, (err, stdout, stderr) => resolve({ ok: !err, out: (String(stdout) + String(stderr)).trim() }))
  })

export interface LogItem { sha: string; date: string; title: string; note: string }
export interface UpdateStatus {
  local: boolean
  installed: { sha: string; date: string; version: string } | null
  latest: { sha: string; date: string; version: string } | null
  behind: number | null
  changes: number // real changes to the app waiting (saves of the data do not count)
  dirty: boolean
  canUpdate: boolean
  log: LogItem[]
  source?: 'drive' | 'github'
  error?: string
}

/* ---- updates through the space's Google Drive ----
   A release is one source package (about 5 MB) plus a small manifest in the "ASO Companion" folder, put there by .github/scripts/publish-release.mjs
   after a merge. The installed app compares the version, downloads the package, checks it, copies the files over the app folder (never data,
   settings or installed libraries) and restarts; the start file then rebuilds. Nothing about GitHub is needed on the computer. */
export interface Manifest { version: string; sha: string; date: string; file: string; sha256: string; size: number; files: string[]; log: LogItem[] }
interface Installed { version: string; sha: string; date: string; files: string[] }
const KEPT = /^(data|\.env|\.aso|\.git|\.next|node_modules|\.test-state)(\/|\.|$)|^aso\.log$|^server\.log$|^dev\.log$/
const safeRel = (f: string) => !!f && !f.startsWith('/') && !/(^|\/)\.\.(\/|$)/.test(f) && !/^[a-zA-Z]:/.test(f) && !KEPT.test(f)
const vparts = (v: string) => (v.match(/^(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number)
export function newer(a: string, b: string): boolean {
  const x = vparts(a), y = vparts(b)
  if (x.length < 3 || y.length < 3) return false
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]
  return false
}

export async function driveManifest(): Promise<Manifest | null> {
  if (!googleActive()) return null
  try {
    const f = await driveGet('release__latest.json')
    if (!f) return null
    const m = JSON.parse(f.bytes.toString('utf8')) as Manifest
    return m && typeof m.version === 'string' && typeof m.file === 'string' && /^[0-9a-f]{64}$/.test(m.sha256 || '') && Array.isArray(m.files) ? m : null
  } catch { return null }
}

async function readInstalled(root: string): Promise<Installed | null> {
  try {
    const j = JSON.parse(await readFile(path.join(root, '.aso', 'release.json'), 'utf8')) as Installed
    return j && typeof j.version === 'string' ? j : null
  } catch { return null }
}
async function pkgVersion(root: string): Promise<string> {
  try { return cleanV(JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version) } catch { return '' }
}

/** download, check and copy a release over the app folder. Returns the files that were removed because the new version no longer has them. */
export async function applyRelease(m: Manifest, bytes: Buffer, root = process.cwd()): Promise<{ ok: boolean; out: string }> {
  if (bytes.length !== m.size || createHash('sha256').update(bytes).digest('hex') !== m.sha256) return { ok: false, out: 'The downloaded update is damaged, so it was not installed. Try again.' }
  const work = path.join(root, '.aso', 'updates')
  await rm(work, { recursive: true, force: true })
  await mkdir(path.join(work, 'x'), { recursive: true })
  await writeFile(path.join(work, 'r.tar.gz'), bytes)
  const t = await new Promise<{ ok: boolean; out: string }>((resolve) =>
    execFile('tar', ['-xzf', 'r.tar.gz', '-C', 'x'], { cwd: work, timeout: 120_000, windowsHide: true }, (err, so, se) => resolve({ ok: !err, out: (String(so) + String(se)).trim() })))
  if (!t.ok) { await rm(work, { recursive: true, force: true }); return { ok: false, out: 'The update could not be unpacked: ' + t.out.slice(0, 300) } }
  try {
    const files = m.files.filter(safeRel)
    for (const f of files) {
      const dest = path.join(root, f)
      await mkdir(path.dirname(dest), { recursive: true })
      await cp(path.join(work, 'x', f), dest, { force: true })
    }
    /* files the new version dropped: remove them, so nothing old can break the build */
    const prev = await readInstalled(root)
    let before: string[] = prev?.files || []
    if (!before.length) {
      const ls = await run('git', ['ls-files'])
      if (ls.ok) before = ls.out.split('\n').map((l) => l.trim()).filter(Boolean)
    }
    const keep = new Set(files)
    for (const f of before) if (safeRel(f) && !keep.has(f)) await unlink(path.join(root, f)).catch(() => undefined)
    await mkdir(path.join(root, '.aso'), { recursive: true })
    await writeFile(path.join(root, '.aso', 'release.json'), JSON.stringify({ version: m.version, sha: m.sha, date: m.date, files } satisfies Installed))
    /* the start file rebuilds when the build is missing */
    await rm(path.join(root, '.next', 'BUILD_ID'), { force: true })
    await rm(path.join(root, '.next', 'aso-built.txt'), { force: true })
    return { ok: true, out: `Updated to v${m.version}.` }
  } catch (e) {
    return { ok: false, out: 'The update could not be installed: ' + String((e as Error).message || e).slice(0, 300) }
  } finally {
    await rm(work, { recursive: true, force: true })
  }
}

export async function driveUpdateStatus(m: Manifest, root = process.cwd()): Promise<UpdateStatus> {
  const rel = await readInstalled(root)
  const version = rel?.version || (await pkgVersion(root))
  let sha = rel?.sha || ''
  let date = rel?.date || ''
  if (!sha) { const h = await run('git', ['rev-parse', 'HEAD']); if (h.ok && /^[0-9a-f]{40}$/.test(h.out)) { sha = h.out; date = (await run('git', ['log', '-1', '--format=%cI'])).out } }
  const installed = { sha, date, version }
  const fresh = newer(m.version, version)
  const waiting = fresh ? m.log.filter((l) => !date || !l.date || l.date > date) : []
  return {
    local: true, installed, latest: { sha: m.sha, date: m.date, version: m.version }, behind: fresh ? Math.max(1, waiting.length) : 0,
    changes: fresh ? waiting.length : 0, dirty: false, canUpdate: fresh, log: (fresh && waiting.length ? waiting : m.log).slice(0, 40), source: 'drive',
  }
}

const REPO = () => process.env.GITHUB_REPO || 'justkhalid/aso-companion'
const BRANCH = () => process.env.GITHUB_BRANCH || 'main'

async function gh<T>(path: string): Promise<T | null> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
  if (process.env.GITHUB_PAT) headers.Authorization = `Bearer ${process.env.GITHUB_PAT}`
  const r = await fetch(`https://api.github.com/repos/${REPO()}/${path}`, { headers, cache: 'no-store' })
  return r.ok ? ((await r.json()) as T) : null
}

/* the version number is the one in package.json ("0.3.0"); it goes up by hand whenever something worth announcing is released */
const cleanV = (v: unknown) => (typeof v === 'string' && /^\d+\.\d+/.test(v) ? v : '')
async function installedVersion(): Promise<string> {
  try { return cleanV(JSON.parse(await readFile(path.join(process.cwd(), 'package.json'), 'utf8')).version) } catch { return '' }
}
async function latestVersion(): Promise<string> {
  const f = await gh<{ content?: string }>(`contents/package.json?ref=${BRANCH()}`)
  try { return f?.content ? cleanV(JSON.parse(Buffer.from(f.content, 'base64').toString('utf8')).version) : '' } catch { return '' }
}

type Commit = { sha: string; commit: { message: string; committer?: { date?: string } } }

/* the change log shows what people changed in the app: saves of the data and merge bookkeeping are left out, a merged pull request shows its title */
function toLog(commits: Commit[]): LogItem[] {
  const out: LogItem[] = []
  for (const c of commits) {
    const [first, ...rest] = c.commit.message.split('\n')
    if (/^aso-companion:/i.test(first) || /^Merge (origin|remote-tracking)/i.test(first) || /^Merge branch/i.test(first)) continue
    const lines = rest.map((l) => l.trim()).filter(Boolean)
    const isPr = /^Merge pull request/i.test(first)
    out.push({ sha: c.sha.slice(0, 7), date: c.commit.committer?.date || '', title: isPr ? lines[0] || first : first, note: isPr ? '' : lines.filter((l) => !/^(Co-Authored-By|Claude-Session)/i.test(l)).slice(0, 4).join('\n') })
  }
  return out
}

export async function updateStatus(): Promise<UpdateStatus> {
  const local = isLocal()
  if (local) { const m = await driveManifest(); if (m) return driveUpdateStatus(m) }
  let installed: UpdateStatus['installed'] = null
  let dirty = false
  if (local) {
    const h = await run('git', ['rev-parse', 'HEAD'])
    if (h.ok && /^[0-9a-f]{40}$/.test(h.out)) {
      const d = await run('git', ['log', '-1', '--format=%cI'])
      installed = { sha: h.out, date: d.ok ? d.out : '', version: await installedVersion() }
      dirty = !!(await run('git', ['status', '--porcelain', '--untracked-files=no'])).out
    }
  }
  const head = await gh<Commit>(`commits/${BRANCH()}`)
  if (!head) return { local, installed, latest: null, behind: null, changes: 0, dirty, canUpdate: false, log: [], error: 'GitHub could not be reached.' }
  const latest = { sha: head.sha, date: head.commit.committer?.date || '', version: await latestVersion() }
  let behind: number | null = null
  let commits: Commit[] = []
  if (installed && installed.sha !== latest.sha) {
    const cmp = await gh<{ ahead_by: number; commits: Commit[] }>(`compare/${installed.sha}...${BRANCH()}`)
    if (cmp) { behind = cmp.ahead_by; commits = cmp.commits.slice().reverse() }
  } else if (installed) behind = 0
  /* no installed version to compare with (the website copy, or a copy that is not a git folder): show the latest changes */
  if (!commits.length && behind !== 0) commits = (await gh<Commit[]>(`commits?sha=${BRANCH()}&per_page=60`)) || []
  const all = toLog(commits)
  return { local, installed, latest, behind, changes: behind ? all.length : 0, dirty, canUpdate: local && !!installed && !dirty, log: all.slice(0, 40) }
}

/** pull the new code (fast-forward only, so nothing local is ever overwritten) */
export async function pullUpdate(): Promise<{ ok: boolean; out: string }> {
  if (!isLocal()) return { ok: false, out: 'Updating only works on the director\'s computer.' }
  const m = await driveManifest()
  if (m) {
    const root = process.cwd()
    const rel = await readInstalled(root)
    if (!newer(m.version, rel?.version || (await pkgVersion(root)))) return { ok: true, out: 'Already the latest version.' }
    const f = await driveGet(m.file)
    if (!f) return { ok: false, out: 'The update file is not in Google Drive yet. Try again in a few minutes.' }
    return applyRelease(m, f.bytes)
  }
  const st = await run('git', ['status', '--porcelain', '--untracked-files=no'])
  if (st.out) return { ok: false, out: 'This copy has changes of its own, so it was not updated:\n' + st.out }
  /* with the saved GitHub token the pull never asks for a login */
  const pat = process.env.GITHUB_PAT
  const auth = pat ? ['-c', 'credential.helper=', '-c', 'http.https://github.com/.extraheader=AUTHORIZATION: basic ' + Buffer.from('x-access-token:' + pat).toString('base64')] : []
  const r = await run('git', [...auth, 'pull', '--ff-only', 'origin', BRANCH()], true)
  return pat ? { ok: r.ok, out: r.out.split(Buffer.from('x-access-token:' + pat).toString('base64')).join('***') } : r
}
