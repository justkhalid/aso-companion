import { DAY_FULL, DAY_KEYS } from './constants'
import { isoOf, parseISO } from './app-utils'
import { load, siteFonts, MUTED } from './clubs-calendar-export'
import { PUBLIC_CLASS_TONE, PUBLIC_CLUB_TONE, PUBLIC_EVENT_TONE, publicClassItems } from './calendar-items'
import { renderTimetablePNG } from './export-canvas'
import type { GridItem, LegendEntry } from '@/components/weekly-grid'
import { MONTH_THEMES } from './month-themes'
import { paintBackdrop, paintFooter, paintHeader } from './month-frame'
import { holidaysOf } from './holidays'
import type { MonthOptions, Occ } from './month-export'
import type { State } from './types'

/* The month picture is the normal weekly calendar, set inside the month's theme. Everything that happens on a weekday
   in this month is one chip of the week; holidays that close the space are listed under it. */
export async function renderWeeklyMonth(state: State, o: MonthOptions, occ: Map<string, Occ[]>): Promise<HTMLCanvasElement> {
  const [logo, f] = await Promise.all([load('/aso-logo.webp'), siteFonts()])
  const theme = MONTH_THEMES[o.month]
  const W = 3200
  const H = 1800
  const M = 110
  const TOP = 250
  const FOOT = 128

  const items: GridItem[] = []
  if (o.classes) items.push(...publicClassItems(state, new Date(2000, 0, 3)).filter((i) => !i.id.includes(':off')))
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
  paintBackdrop(g, theme, o.month, W, H, o.transparent ? 'none' : 'all')
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

