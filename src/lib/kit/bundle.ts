/* The whole social kit in one zip: for every club and event the poster, story, WhatsApp picture, highlight cover, icon and caption, plus a month calendar. */
import type { Club, EventEntry, State } from '../types'
import { kitRec, kitParams, kitSlug, kitTheme, type KitRec } from './derive'
import { loadKitFonts, makeCover, makeHighlight, makeIconPng, makeLinksCover, makeLinksStory, makeStory } from './engine'
import { zipFiles } from './zip'

type File = { name: string; blob: Blob }
const enc = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('A picture could not be made.'))), type, q))
const png = (c: HTMLCanvasElement) => enc(c, 'image/png')
/* the big pictures go in as high quality JPEG: the fine grain makes PNG files of several MB each */
const jpg = (c: HTMLCanvasElement) => enc(c, 'image/jpeg', 0.93)

async function posterFile(R: KitRec): Promise<{ ext: string; blob: Blob } | null> {
  if (!R.poster) return null
  try {
    const r = await fetch(R.poster)
    if (!r.ok) return null
    const blob = await r.blob()
    const ext = blob.type.includes('webp') ? 'webp' : blob.type.includes('png') ? 'png' : 'jpg'
    return { ext, blob }
  } catch {
    return null
  }
}

/** every picture of one club or event, in a folder of its own */
export async function kitFiles(R: KitRec, folder: string): Promise<File[]> {
  await loadKitFonts()
  const p = await kitParams(R)
  const t = kitTheme(R)
  const files: File[] = []
  const poster = await posterFile(R)
  if (poster) files.push({ name: `${folder}/poster.${poster.ext}`, blob: poster.blob })
  files.push({ name: `${folder}/story.jpg`, blob: await jpg(await makeStory(p, t)) })
  if (R.type === 'club') files.push({ name: `${folder}/whatsapp-picture.jpg`, blob: await jpg(await makeCover(p, t)) })
  files.push({ name: `${folder}/highlight-cover.jpg`, blob: await jpg(await makeHighlight(p, t)) })
  files.push({ name: `${folder}/icon.png`, blob: await png(await makeIconPng(p, t)) })
  const text = [R.name, [R.day, R.time, R.venue].filter(Boolean).join(' | '), '', R.cap, R.wa ? `\nWhatsApp group: ${R.wa}` : ''].join('\n').trim() + '\n'
  files.push({ name: `${folder}/caption.txt`, blob: new Blob([text], { type: 'text/plain' }) })
  return files
}

/** the ASO community group: the one link of the "Links" highlight */
export const ASO_COMMUNITY_URL = 'https://chat.whatsapp.com/JPpn70ho996IAKS1bNjCTm'

/** the "Links" highlight: one story (the ASO community, its WhatsApp icon and QR code) and the round cover */
export async function linksFiles(_state?: State, folder = 'Links'): Promise<File[]> {
  await loadKitFonts()
  const t = kitTheme({ look: 'aso', palette: 'same', decor: 'same', bg: 0 })
  return [
    { name: `${folder}/links-story.jpg`, blob: await jpg(await makeLinksStory(ASO_COMMUNITY_URL, t)) },
    { name: `${folder}/links-highlight-cover.jpg`, blob: await jpg(await makeLinksCover(t)) },
  ]
}

export interface BundleOptions {
  clubs: boolean
  events: boolean
  month: { year: number; month: number } | null // a month calendar (story and post) to add, or none
  onProgress?: (done: number, total: number, label: string) => void
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

export async function buildKitZip(state: State, o: BundleOptions): Promise<Blob> {
  const jobs: { kind: 'club' | 'event'; item: Club | EventEntry }[] = [
    ...(o.clubs ? state.clubs.filter((c) => !c.placeholder).map((item) => ({ kind: 'club' as const, item })) : []),
    ...(o.events ? state.events.map((item) => ({ kind: 'event' as const, item })) : []),
  ]
  const total = jobs.length + (o.month ? 1 : 0)
  const files: File[] = []
  const used = new Set<string>()
  let done = 0
  for (const j of jobs) {
    const R = kitRec(j.kind, j.item)
    const label = R.name
    o.onProgress?.(done, total, label)
    let slug = kitSlug(R)
    for (let n = 2; used.has(j.kind + slug); n++) slug = `${kitSlug(R)}-${n}`
    used.add(j.kind + slug)
    files.push(...(await kitFiles(R, `${j.kind === 'club' ? 'Clubs' : 'Events'}/${slug}`)))
    done++
  }
  if (o.clubs) files.push(...(await linksFiles(state)))
  if (o.month) {
    o.onProgress?.(done, total, 'Month calendar')
    const { year, month } = o.month
    const stem = `Calendar/${year}-${String(month + 1).padStart(2, '0')}-${MONTHS[month]}`
    const ms = await import('./month-story')
    files.push({ name: `${stem}-story.jpg`, blob: await jpg(ms.monthStoryStill(await ms.buildMonthStory(state, year, month))) })
    const { renderMonth } = await import('../month-export')
    files.push({ name: `${stem}-post.jpg`, blob: await jpg(await renderMonth(state, { year, month, clubs: true, events: true, holidays: true, scale: 0.625 })) })
    done++
  }
  o.onProgress?.(total, total, 'Packing the zip')
  return zipFiles(files)
}
