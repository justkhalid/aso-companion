/* Links the club kit to the app's own data: a club or event becomes a "kit record" (name, day, time, venue, look, icon, caption, poster),
   and what the admin changes in the kit is kept on the club or event as `kit`, only where it differs from what is worked out here. */
import type { Club, EventEntry, KitOverrides } from '../types'
import { LOOKS, type RGB } from './decor'
import { KIT_ICONS } from './icons'
import { loadImage, type KitParams, type KitTheme } from './engine'

export const WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
const D3: Record<string, string> = { Mon: 'MONDAY', Tue: 'TUESDAY', Wed: 'WEDNESDAY', Thu: 'THURSDAY', Fri: 'FRIDAY', Sat: 'SATURDAY', Sun: 'SUNDAY' }
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
export const KICKERS = ['WEEKLY CLUB', 'BIWEEKLY CLUB', 'MONTHLY CLUB', 'WORKSHOP', 'CLASS', 'SPECIAL EVENT', 'OPEN MIC', 'COMPETITION']

/* the app's own club icon -> the look it starts with, and the kit icon it starts with */
const LOOK_BY_ICON: Record<string, string> = { physics: 'philo', globe: 'africa', brain: 'psychology', community: 'speaking', literature: 'reading', cinema: 'movie', art: 'sunset', bike: 'sports', study: 'gold', environment: 'eco', expo: 'ocean', tech: 'teal' }
const GEN_ICON: Record<string, string> = { art: 'kids', study: 'language', environment: 'environment', expo: 'geography', tech: 'cybersecurity' }

/* names in Arabic need an English name for the story; these three were set when the kit was built */
const KIT_NAMES: Record<string, { kicker: string; top: string; word: string }> = {
  xmv0z3cpq5k7qw: { kicker: 'دورة مجانية الديداكتيك والتشريع التربوي', top: 'FREE', word: 'COURSE' },
  xmv597893u5a1j: { kicker: 'AWARENESS MONTH', top: 'CYBERSECURITY', word: 'AWARENESS' },
  xmv57zyq13i1zk: { kicker: 'LEARN. PRACTICE. SERVE. PROTECT.', top: 'BEGOAS', word: 'ECO IMPACT' },
}

/* framed 3:4 posters that came with the kit, used until a poster is added in the Social kit (items without one use the website poster) */
const FRAMED = new Set(['xmuzvr51m52js5', 'xmuzvsa0u3j4s1', 'xmv09rj4g74t8p', 'xmv0ww9qzucgme', 'xmv7zvfbshusl1', 'xmv8dxatdhi9lp'])

/** the kit icon a club or event starts with, from the icon it has in the app */
export function kitIconOf(appIcon?: string): string {
  const look = LOOK_BY_ICON[appIcon || ''] || 'aso'
  return GEN_ICON[appIcon || ''] || LOOKS[look][5]
}

export interface KitRec {
  id: string
  type: 'club' | 'event'
  name: string
  lead: string
  desc: string
  kicker: string
  top: string
  word: string
  day: string
  time: string
  venue: string
  look: string
  palette: string // 'same' or a look key
  decor: string // 'same' or a decoration key
  icon: string
  bg: number
  cap: string
  wa: string
  poster: string | null
  sitePoster: string | null // the poster shown on the website
  nameNeeded: boolean // the name is Arabic and no English name was typed yet
  short: string // short name for calendar pictures ('' = automatic)
}

export function fmtKitTime(r: string | undefined): string {
  if (!r || !r.includes('-')) return ''
  const f = (s: string) => { const [h, m] = s.split(':').map(Number); return { s: `${h % 12 || 12}:${String(m || 0).padStart(2, '0')}`, ap: h >= 12 ? 'PM' : 'AM' } }
  const [a, b] = r.split('-').map(f)
  return a.ap === b.ap ? `${a.s} - ${b.s} ${b.ap}` : `${a.s} ${a.ap} - ${b.s} ${b.ap}`
}
const dparts = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return { d, m: MONTHS[m - 1], wd: WEEK[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7] }
}
function splitName(name: string): [string, string] {
  const n = name.replace(/\s+(Club|Activity)$/i, '').trim()
  let top = '', word = n
  if (n.includes(':')) { [top, word] = n.split(':').map((s) => s.trim()) }
  else { const w = n.split(/\s+/); if (w.length > 1) { top = w.slice(0, -1).join(' '); word = w[w.length - 1] } }
  return [top.toUpperCase(), word.toUpperCase()]
}
const ARABIC = /[؀-ۿ]/

function clubDay(c: Club): string {
  const ds = (c.days || []).map((d) => D3[d]).filter(Boolean)
  if (ds.length === 1) return `${c.freq === 'biweekly' ? 'EVERY OTHER' : 'EVERY'} ${ds[0]}`
  return ds.length ? ds.map((d) => d + 'S').join(' AND ') : 'DAY TO BE ANNOUNCED'
}
function eventDay(e: EventEntry): string {
  const once = !e.recur || e.recur === 'once' || e.recur === 'none'
  if (once) {
    if (!e.date) return 'DATE TO BE ANNOUNCED'
    const d = dparts(e.date)
    return `${d.wd} ${d.d} ${d.m}`
  }
  const wd = e.day ? D3[e.day] : e.from ? dparts(e.from).wd : ''
  const until = e.until ? ` UNTIL ${dparts(e.until).d} ${dparts(e.until).m.slice(0, 3)}` : ''
  if (e.recur === 'monthly') return `ONCE A MONTH${until}`
  return `${e.recur === 'biweekly' ? 'EVERY OTHER' : 'EVERY'} ${wd || 'WEEK'}${until}`.trim()
}

const cleanDesc = (s: string | undefined) => (s || '').replace(/[‎‏​*]/g, '').trim()

export function kitRec(kind: 'club' | 'event', item: Club | EventEntry): KitRec {
  const c = item as Club & EventEntry
  const name = (kind === 'club' ? c.name : c.title) || ''
  let [top, word] = splitName(name)
  if (ARABIC.test(name)) { top = ''; word = '' }
  const seed = KIT_NAMES[item.id]
  if (seed) { top = seed.top; word = seed.word }
  const look = LOOK_BY_ICON[c.icon || ''] || 'aso'
  const icon = GEN_ICON[c.icon || ''] || LOOKS[look][5]
  const k: KitOverrides = item.kit || {}
  const R: KitRec = {
    id: item.id,
    type: kind,
    name,
    lead: c.lead || '',
    desc: cleanDesc(c.desc),
    kicker: seed ? seed.kicker : kind === 'club' ? (c.freq === 'biweekly' ? 'BIWEEKLY CLUB' : c.freq === 'monthly' ? 'MONTHLY CLUB' : 'WEEKLY CLUB') : 'SPECIAL EVENT',
    top,
    word,
    day: kind === 'club' ? clubDay(c) : eventDay(c),
    time: fmtKitTime(c.time),
    venue: (kind === 'club' ? c.room : c.place || '').toUpperCase() || 'AMERICAN SPACE OUJDA',
    look,
    palette: 'same',
    decor: 'same',
    icon,
    bg: 0,
    cap: '',
    wa: kind === 'club' ? c.url || '' : '',
    poster: FRAMED.has(item.id) ? `/kit/framed/${item.id}.webp` : c.poster || null,
    sitePoster: c.poster || null,
    nameNeeded: false,
    short: '',
  }
  R.cap = R.desc
  /* what was set in the kit wins */
  if (k.kicker !== undefined) R.kicker = k.kicker
  R.short = k.short || ''
  if (k.top !== undefined) R.top = k.top
  if (k.word !== undefined) R.word = k.word
  if (k.look && LOOKS[k.look]) { R.look = k.look; if (k.icon === undefined) R.icon = LOOKS[k.look][5] }
  if (k.palette) R.palette = k.palette
  if (k.decor) R.decor = k.decor
  if (k.icon && KIT_ICONS[k.icon]) R.icon = k.icon
  if (k.bg !== undefined) R.bg = k.bg
  if (k.cap !== undefined) R.cap = k.cap
  if (k.wa !== undefined) R.wa = k.wa
  if (k.poster) R.poster = k.poster
  R.nameNeeded = ARABIC.test(name) && !R.word
  return R
}

/* the settings of a record that differ from what the kit would work out alone (this is what is saved on the club or event) */
export function kitDiff(kind: 'club' | 'event', item: Club | EventEntry, form: KitRec): KitOverrides {
  const base = kitRec(kind, { ...item, kit: undefined })
  const out: KitOverrides = {}
  if (form.kicker !== base.kicker) out.kicker = form.kicker
  if (form.top !== base.top) out.top = form.top
  if (form.word !== base.word) out.word = form.word
  if (form.look !== base.look) out.look = form.look
  if (form.palette !== base.palette) out.palette = form.palette
  if (form.decor !== base.decor) out.decor = form.decor
  /* the icon follows the look unless another one was picked */
  const implied = form.look !== base.look ? LOOKS[form.look]?.[5] : base.icon
  if (form.icon !== implied) out.icon = form.icon
  if (form.bg !== base.bg) out.bg = form.bg
  if (form.short !== base.short && form.short.trim()) out.short = form.short
  if (form.cap !== base.cap) out.cap = form.cap
  if (form.wa !== base.wa) out.wa = form.wa
  if (form.poster && form.poster !== base.poster) out.poster = form.poster
  return out
}

export function kitTheme(R: Pick<KitRec, 'look' | 'palette' | 'decor' | 'bg'>): KitTheme {
  const L = LOOKS[R.look] || LOOKS.aso
  const pal = LOOKS[R.palette && R.palette !== 'same' ? R.palette : R.look] || L
  return { c1: pal[1] as RGB, c2: pal[2] as RGB, ink: pal[3] as RGB, decor: R.decor && R.decor !== 'same' ? R.decor : L[4], bg: +R.bg || 0 }
}

export async function kitParams(R: KitRec): Promise<KitParams> {
  let im: HTMLImageElement | null = null
  if (R.poster) { try { im = await loadImage(R.poster) } catch { im = null } }
  return { im, kicker: R.kicker, top: R.top, word: R.word || 'CLUB NAME', day: R.day, time: R.time, venue: R.venue, icon: R.icon, mode: R.type }
}

export const kitSlug = (R: Pick<KitRec, 'top' | 'word' | 'name'>) =>
  [R.top, R.word].filter(Boolean).join(' ').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || (R.name || 'club').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'club'
