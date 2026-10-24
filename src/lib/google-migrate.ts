/* One-time copy of everything the app keeps on GitHub into the Google Drive folder: the data, the Instagram connection,
   the posters and the scheduled posts. Nothing is deleted from GitHub. Running it again only copies what is missing. */
import { driveGet, driveHas, driveName, drivePut } from './google'

const GH = () => process.env.GITHUB_API_BASE || 'https://api.github.com'

const gh = () => {
  const token = process.env.GITHUB_PAT
  const repo = process.env.GITHUB_REPO || 'justkhalid/aso-companion'
  const branch = process.env.GITHUB_BRANCH || 'main'
  return { token, repo, branch, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } }
}

async function ghFile(path: string): Promise<Buffer | null> {
  const g = gh()
  const r = await fetch(`${GH()}/repos/${g.repo}/contents/${path}?ref=${encodeURIComponent(g.branch)}`, { headers: { ...g.headers, Accept: 'application/vnd.github.raw+json' }, cache: 'no-store' })
  return r.ok ? Buffer.from(await r.arrayBuffer()) : null
}

async function ghDir(path: string): Promise<string[]> {
  const g = gh()
  const r = await fetch(`${GH()}/repos/${g.repo}/contents/${path}?ref=${encodeURIComponent(g.branch)}`, { headers: g.headers, cache: 'no-store' })
  if (!r.ok) return []
  return ((await r.json()) as { name: string; type: string }[]).filter((f) => f.type === 'file').map((f) => f.name)
}

export interface MigrateResult { ok: boolean; msg: string; copied: { data: boolean; connection: boolean; posters: number; scheduled: number } }

export async function copyGithubToDrive(readState: () => Promise<unknown | null>): Promise<MigrateResult> {
  const copied = { data: false, connection: false, posters: 0, scheduled: 0 }
  try {
    /* the data: only when Drive has none yet, so a copy made later never overwrites newer work */
    if (!(await driveHas('aso-state.json'))) {
      const st = await readState()
      if (st && (st as { v?: number }).v === 1) {
        const w = await drivePut('aso-state.json', JSON.stringify(st))
        if (!w.ok) return { ok: false, msg: w.msg, copied }
        copied.data = true
      }
    }
    if (!gh().token) return { ok: true, msg: copied.data ? 'The data was copied. No GitHub key is set on this computer, so the posters and posts were not copied.' : 'Nothing to copy.', copied }
    if (!(await driveHas('social.enc.json'))) {
      const b = await ghFile('data/social.enc.json')
      if (b && b.toString('utf8').trim()) {
        const w = await drivePut('social.enc.json', b)
        if (w.ok) copied.connection = true
      }
    }
    for (const n of await ghDir('data/posters')) {
      if (await driveHas(driveName(`posters/${n}`))) continue
      const b = await ghFile(`data/posters/${n}`)
      if (b && (await drivePut(driveName(`posters/${n}`), b, 'image/webp')).ok) copied.posters++
    }
    for (const n of await ghDir('data/schedule')) {
      if (await driveHas(driveName(`schedule/${n}`))) continue
      const b = await ghFile(`data/schedule/${n}`)
      if (b && (await drivePut(driveName(`schedule/${n}`), b)).ok) copied.scheduled++
    }
    const parts = [copied.data && 'the data', copied.connection && 'the Instagram connection', copied.posters > 0 && `${copied.posters} posters`, copied.scheduled > 0 && `${copied.scheduled} scheduled post files`].filter(Boolean)
    return { ok: true, msg: parts.length ? `Copied ${parts.join(', ')} to Google Drive.` : 'Everything was already in Google Drive.', copied }
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : 'The copy did not finish.', copied }
  }
}

export { driveGet }
