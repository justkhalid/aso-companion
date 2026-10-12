import { DAY_FULL, DAY_KEYS } from './constants'
import { addDays, classStatusOn, clubStatusOn, eventStatusOn, isOnceEvent, isoOf, parseISO, parseSlot } from './app-utils'
import { load, siteFonts, MUTED } from './clubs-calendar-export'
import { PUBLIC_CLASS_TONE, PUBLIC_CLUB_TONE, PUBLIC_EVENT_TONE, publicClassItems, publicGroupName } from './calendar-items'
import { renderTimetablePNG } from './export-canvas'
import type { GridItem, LegendEntry } from '@/components/weekly-grid'
import { MONTH_THEMES } from './month-themes'
import { paintBackdrop, paintFooter, paintHeader } from './month-frame'
import { holidaysOf } from './holidays'
import type { State } from './types'

/* A month of clubs and events as one calendar picture in the site's style, with big readable names and times.
   Clubs are purple, events gold, cancelled sessions grey. */

export interface MonthOptions {
  year: number
  month: number // 0-11
  clubs: boolean
  events: boolean
  classes?: boolean
  holidays?: boolean
}

type Kind = 'club' | 'event' | 'class'
interface Occ {
  kind: Kind
  title: string
  time: string
  startMin: number
  place: string
  icon?: string
  off: boolean
  cover?: string
}

const WEEK_MS = 604800000
const dayIdx = (d: Date) => (d.getDay() === 0 ? 6 : d.getDay() - 1) // Mon = 0

/* does a repeating item fall on this date (weekday, series start and end, every 2 or 4 weeks)? */
function repeatsOn(d: Date, dayKeys: string[], recur: string | undefined, from: string | undefined, until: string | undefined, anchorFallback: string): boolean {
  const iso = isoOf(d)
  if (!dayKeys.includes(DAY_KEYS[dayIdx(d)])) return false
  if (from && iso < from) return false
  if (until && iso > until) return false
  const step = recur === 'biweekly' ? 2 : recur === 'monthly' ? 4 : 1
  if (step === 1) return true
  const anchor = parseISO(from || anchorFallback)
  const anchorDay = addDays(anchor, (dayIdx(d) - dayIdx(anchor) + 7) % 7)
  return Math.round((d.getTime() - anchorDay.getTime()) / WEEK_MS) % step === 0
}

/** everything that happens on each date of the month (keys are ISO dates) */
export function monthOccurrences(state: State, o: MonthOptions): Map<string, Occ[]> {
  const out = new Map<string, Occ[]>()
  const last = new Date(o.year, o.month + 1, 0).getDate()
  const anchor = state.settings.s1Start || isoOf(new Date(o.year, o.month, 1))
  const push = (iso: string, x: Occ) => out.set(iso, [...(out.get(iso) || []), x])
  for (let day = 1; day <= last; day++) {
    const d = new Date(o.year, o.month, day)
    const iso = isoOf(d)
    if (o.clubs) {
      for (const c of state.clubs || []) {
        if (c.placeholder || !c.time || !repeatsOn(d, c.days || [], c.freq, c.from, c.until, anchor)) continue
        const st = clubStatusOn(state, c.id, iso)
        push(iso, { kind: 'club', title: c.name, time: c.time, startMin: parseSlot(c.time).mins, place: c.room, icon: c.icon, off: st.kind === 'cancelled', cover: st.kind === 'cover' ? st.cover : undefined })
      }
    }
    if (o.classes) {
      for (const c of state.classes || []) {
        if (!c.time || !repeatsOn(d, c.days || [], undefined, undefined, undefined, anchor)) continue
        const st = classStatusOn(state, c, iso)
        push(iso, { kind: 'class', title: publicGroupName(c.code, c.level), time: c.time, startMin: parseSlot(c.time).mins, place: c.room, off: st.kind === 'cancelled' })
      }
    }
    if (o.events) {
      for (const e of state.events || []) {
        const hit = isOnceEvent(e) ? e.date === iso : !!e.day && repeatsOn(d, [e.day], e.recur, e.from, e.until, anchor)
        if (!hit) continue
        const st = eventStatusOn(state, e.id, iso)
        push(iso, { kind: 'event', title: e.title, time: e.time, startMin: e.time ? parseSlot(e.time).mins : 0, place: e.place || '', icon: e.icon || 'calendar', off: st.kind === 'cancelled' })
      }
    }
  }
  for (const list of out.values()) list.sort((a, b) => a.startMin - b.startMin)
  return out
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const monthLabel = (year: number, month: number) => `${MONTHS[month]} ${year}`

/* The month picture is the normal weekly calendar, set inside the month's theme. Everything that happens on a weekday
   in this month is one chip of the week; holidays that close the space are listed under it. */
export async function renderMonth(state: State, o: MonthOptions): Promise<HTMLCanvasElement> {
  const [logo, f] = await Promise.all([load('/aso-logo.png'), siteFonts()])
  const theme = MONTH_THEMES[o.month]
  const W = 3200
  const H = 1800
  const M = 110
  const TOP = 250
  const FOOT = 128

  const items: GridItem[] = []
  if (o.classes) items.push(...publicClassItems(state, new Date(2000, 0, 3)).filter((i) => !i.id.includes(':off')))
  const occ = monthOccurrences(state, { ...o, classes: false })
  const seen = new Map<string, GridItem>()
  for (const [iso, list] of occ.entries()) {
    const d = parseISO(iso)
    const day = DAY_KEYS[d.getDay() === 0 ? 6 : d.getDay() - 1]
    for (const x of list) {
      if (x.off || !x.time) continue
      const key = `${x.kind}|${x.title}|${x.time}`
      const hit = seen.get(key)
      if (hit) {
        if (!hit.days.includes(day)) hit.days.push(day)
      } else {
        const it: GridItem = { id: key, days: [day], slot: x.time, code: x.title, room: x.place, icon: x.icon, tone: x.kind === 'club' ? PUBLIC_CLUB_TONE : PUBLIC_EVENT_TONE }
        seen.set(key, it)
        items.push(it)
      }
    }
  }
  const legend: LegendEntry[] = [
    ...(items.some((i) => i.tone === PUBLIC_CLASS_TONE) ? [{ label: 'English classes', tone: PUBLIC_CLASS_TONE }] : []),
    ...(items.some((i) => i.tone === PUBLIC_CLUB_TONE) ? [{ label: 'Clubs', tone: PUBLIC_CLUB_TONE }] : []),
    ...(items.some((i) => i.tone === PUBLIC_EVENT_TONE) ? [{ label: 'Events', tone: PUBLIC_EVENT_TONE }] : []),
  ]
  const blob = await renderTimetablePNG({ title: `${theme.name} ${o.year}`, subtitle: state.settings.institute, items, legend, zoom: 1 })
  const pic = blob ? await load(URL.createObjectURL(blob)) : null

  /* closed days of the month */
  const hol = o.holidays ? holidaysOf(o.year) : new Map()
  const closed: string[] = []
  let moon = false
  const last = new Date(o.year, o.month + 1, 0).getDate()
  for (let day = 1; day <= last; day++) {
    const d = new Date(o.year, o.month, day)
    const list = (hol.get(isoOf(d)) || []) as { name: string; closed?: boolean; moon?: boolean }[]
    if (list.some((h) => h.moon)) moon = true
    const c = list.filter((h) => h.closed)
    if (c.length) closed.push(`${(DAY_FULL[DAY_KEYS[d.getDay() === 0 ? 6 : d.getDay() - 1]] || '').slice(0, 3)} ${day} ${theme.name.slice(0, 3)} · ${c.map((h) => h.name).join(' / ')}`)
  }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')!
  paintBackdrop(g, theme, o.month, W, H)
  const names = [o.classes && 'CLASSES', o.clubs && 'CLUBS', o.events && 'EVENTS'].filter(Boolean) as string[]
  paintHeader(g, f, theme, o.year, names)

  const noteH = closed.length ? 70 : 0
  const areaTop = TOP + 10
  const areaBottom = H - FOOT - noteH
  let bottom = areaBottom
  if (pic) {
    const k = Math.min((W - M * 2) / pic.width, (areaBottom - areaTop) / pic.height)
    const w = pic.width * k
    const h = pic.height * k
    const x = (W - w) / 2
    const y = areaTop + (areaBottom - areaTop - h) / 2
    g.save()
    g.shadowColor = 'rgba(0,0,0,.18)'
    g.shadowBlur = 40
    g.shadowOffsetY = 12
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.roundRect(x, y, w, h, 36)
    g.fill()
    g.restore()
    g.save()
    g.beginPath()
    g.roundRect(x, y, w, h, 36)
    g.clip()
    g.drawImage(pic, x, y, w, h)
    g.restore()
    bottom = y + h
  }
  if (closed.length) {
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = `700 36px ${f.body}`
    g.fillStyle = MUTED
    g.fillText('Space closed:  ' + closed.join('     ·     '), W / 2, bottom + noteH / 2 + 8)
  }
  paintFooter(g, f, logo, `${state.settings.institute}${moon ? ' · Islamic holiday dates follow the moon and can shift by a day' : ''}`, W, H, bottom + noteH)
  return canvas
}

export async function downloadMonth(state: State, o: MonthOptions): Promise<boolean> {
  const canvas = await renderMonth(state, o)
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) return false
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ASO_${[o.classes && 'Classes', o.clubs && 'Clubs', o.events && 'Events'].filter(Boolean).join('_')}_${o.year}-${String(o.month + 1).padStart(2, '0')}.png`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return true
}
