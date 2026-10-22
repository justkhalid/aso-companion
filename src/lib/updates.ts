/* Version information and the in-app updater (server only). The installed version is the git commit of the folder the app runs from;
   the latest is the main branch of the GitHub repository. Updating pulls the new code; the start file then rebuilds and restarts. */
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { isLocal } from './mode'

const run = (cmd: string, args: string[]) =>
  new Promise<{ ok: boolean; out: string }>((resolve) => {
    execFile(cmd, args, { cwd: process.cwd(), timeout: 120_000, windowsHide: true, shell: process.platform === 'win32' }, (err, stdout, stderr) => resolve({ ok: !err, out: (String(stdout) + String(stderr)).trim() }))
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
  error?: string
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
  const st = await run('git', ['status', '--porcelain', '--untracked-files=no'])
  if (st.out) return { ok: false, out: 'This copy has changes of its own, so it was not updated:\n' + st.out }
  return run('git', ['pull', '--ff-only', 'origin', BRANCH()])
}
