/* Posts scheduled for later. Meta's API cannot hold an Instagram post for later, so the picture (or video) waits here, encrypted,
   and a timer (a GitHub Actions workflow calling /api/social/run-due every 10 minutes) posts what is due.
   Files in data/schedule: <ms>_<id>.meta.json (small: when, what, status) and <ms>_<id>.job.json (the pictures). Both encrypted. */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { derivedKey } from './auth'
import { fileDelete, fileList, fileRead, fileWrite } from './state-store'
import { publish, type PublishInput, type Step } from './social'

const DIR = 'schedule'

export interface Dests { igFeed: boolean; igStory: boolean; fbFeed: boolean; fbStory: boolean }
export interface JobMeta {
  id: string
  at: string // ISO time to post
  label: string // what it is, for the list
  targets: Dests
  kind: 'picture' | 'animation'
  created: string
  status: 'pending' | 'running' | 'done' | 'failed'
  ranAt?: string
  result?: Step[]
}
type JobFiles = { caption: string; tags?: string[]; story?: string; poster?: string; poster45?: string; video?: string } // pictures as base64

function seal(v: unknown): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', derivedKey('schedule'), iv)
  const data = Buffer.concat([c.update(JSON.stringify(v), 'utf8'), c.final()])
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') })
}
function unseal<T>(text: string): T | null {
  try {
    const j = JSON.parse(text) as { iv: string; tag: string; data: string }
    const d = createDecipheriv('aes-256-gcm', derivedKey('schedule'), Buffer.from(j.iv, 'base64'))
    d.setAuthTag(Buffer.from(j.tag, 'base64'))
    return JSON.parse(Buffer.concat([d.update(Buffer.from(j.data, 'base64')), d.final()]).toString('utf8')) as T
  } catch {
    return null
  }
}

const stem = (at: string, id: string) => `${new Date(at).getTime()}_${id}`
const b64 = async (b: Blob | null | undefined) => (b && b.size ? Buffer.from(await b.arrayBuffer()).toString('base64') : undefined)
const blob = (s: string | undefined, type: string) => (s ? new Blob([Buffer.from(s, 'base64')], { type }) : null)

export async function createJob(o: { at: string; label: string; targets: Dests; kind: 'picture' | 'animation'; caption: string; story: Blob | null; poster: Blob | null; poster45: Blob | null; video: Blob | null; tags?: string[] }): Promise<{ ok: boolean; msg: string; id?: string }> {
  const id = randomBytes(5).toString('hex')
  const meta: JobMeta = { id, at: new Date(o.at).toISOString(), label: o.label, targets: o.targets, kind: o.kind, created: new Date().toISOString(), status: 'pending' }
  const files: JobFiles = { caption: o.caption, tags: o.tags, story: await b64(o.story), poster: await b64(o.poster), poster45: await b64(o.poster45), video: await b64(o.video) }
  const w1 = await fileWrite(`${DIR}/${stem(meta.at, id)}.job.json`, seal(files))
  if (!w1.ok) return { ok: false, msg: w1.msg }
  const w2 = await fileWrite(`${DIR}/${stem(meta.at, id)}.meta.json`, seal(meta))
  if (!w2.ok) { await fileDelete(`${DIR}/${stem(meta.at, id)}.job.json`); return { ok: false, msg: w2.msg } }
  return { ok: true, msg: 'Scheduled', id }
}

async function metas(): Promise<{ name: string; meta: JobMeta; sha?: string }[]> {
  const names = (await fileList(DIR)).filter((n) => n.endsWith('.meta.json'))
  const out: { name: string; meta: JobMeta; sha?: string }[] = []
  for (const n of names) {
    const f = await fileRead(`${DIR}/${n}`)
    const m = f ? unseal<JobMeta>(f.text) : null
    if (m && f) out.push({ name: n, meta: m, sha: f.sha })
  }
  return out.sort((a, b) => a.meta.at.localeCompare(b.meta.at))
}

export async function listJobs(): Promise<JobMeta[]> {
  return (await metas()).map((m) => m.meta)
}

export async function cancelJob(id: string): Promise<{ ok: boolean; msg: string }> {
  const m = (await metas()).find((x) => x.meta.id === id)
  if (!m) return { ok: false, msg: 'It is not in the list any more.' }
  if (m.meta.status === 'running') return { ok: false, msg: 'It is being posted right now.' }
  await fileDelete(`${DIR}/${m.name.replace('.meta.json', '.job.json')}`)
  await fileDelete(`${DIR}/${m.name}`, m.sha)
  return { ok: true, msg: 'Removed' }
}

/** post what is due; safe to call often. Each job is claimed first, so it goes out once. */
export async function runDue(): Promise<{ ran: number; results: { id: string; label: string; ok: boolean }[] }> {
  const now = Date.now()
  const results: { id: string; label: string; ok: boolean }[] = []
  for (const m of await metas()) {
    const { meta } = m
    /* a job that has been "running" for a long time was cut off: mark it, never post it twice */
    if (meta.status === 'running' && now - new Date(meta.ranAt || meta.at).getTime() > 30 * 60_000) {
      await fileWrite(`${DIR}/${m.name}`, seal({ ...meta, status: 'failed', result: [{ label: 'Scheduled post', ok: false, msg: 'The post was interrupted. Check Instagram and Facebook before posting it again.' }] } satisfies JobMeta), m.sha)
      await fileDelete(`${DIR}/${m.name.replace('.meta.json', '.job.json')}`)
      continue
    }
    /* finished jobs are kept for a while so the list can show how they went */
    if ((meta.status === 'done' || meta.status === 'failed') && now - new Date(meta.ranAt || meta.at).getTime() > 45 * 86400_000) {
      await fileDelete(`${DIR}/${m.name}`, m.sha)
      continue
    }
    if (meta.status !== 'pending' || new Date(meta.at).getTime() > now) continue
    const claim = await fileWrite(`${DIR}/${m.name}`, seal({ ...meta, status: 'running', ranAt: new Date().toISOString() } satisfies JobMeta), m.sha)
    if (!claim.ok) continue // someone else took it
    const jobName = `${DIR}/${m.name.replace('.meta.json', '.job.json')}`
    let steps: Step[]
    let ok = false
    try {
      const f = await fileRead(jobName)
      const files = f ? unseal<JobFiles>(f.text) : null
      if (!files) throw new Error('The saved pictures could not be read.')
      const input: PublishInput = { targets: meta.targets, caption: files.caption, tags: files.tags, story: blob(files.story, 'image/jpeg'), poster: blob(files.poster, 'image/jpeg'), poster45: blob(files.poster45, 'image/jpeg'), video: blob(files.video, 'video/mp4') }
      const r = await publish(input)
      steps = r.steps
      ok = r.ok
    } catch (e) {
      steps = [{ label: 'Scheduled post', ok: false, msg: e instanceof Error ? e.message : 'failed' }]
    }
    const cur = await fileRead(`${DIR}/${m.name}`)
    await fileWrite(`${DIR}/${m.name}`, seal({ ...meta, status: ok ? 'done' : 'failed', ranAt: new Date().toISOString(), result: steps } satisfies JobMeta), cur?.sha)
    await fileDelete(jobName)
    results.push({ id: meta.id, label: meta.label, ok })
  }
  return { ran: results.length, results }
}
