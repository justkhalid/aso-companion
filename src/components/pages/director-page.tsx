'use client'

import * as React from 'react'
import { Clock, DoorOpen, GraduationCap, History, Sparkles, Users } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { SiteFooter } from '@/components/site-footer'
import { UnifiedCalendar } from '@/components/unified-calendar'
import type { CalTab } from '@/components/calendar-switch'
import { ACTIVITY, STATUS } from '@/lib/activity-colors'
import { clubIcon } from '@/lib/icons'
import { fmt12Min, isoOf } from '@/lib/app-utils'
import { monthOccurrences } from '@/lib/month-export'
import { roomDayDetail } from '@/lib/month-rooms'

/* /calendar, for the director: what is on today, which rooms are free right now, the calendar itself, and what changed.
   Written plainly. No sign-in, nothing to learn. */

function ago(then: Date, now: Date): string {
  const min = Math.round((now.getTime() - then.getTime()) / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

const KIND_DEFAULT = { class: GraduationCap, club: Users, event: Sparkles }

function TodayCard({ now }: { now: Date }) {
  const state = useStore((s) => s.state)
  const iso = isoOf(now)
  const rows = (monthOccurrences(state, { year: now.getFullYear(), month: now.getMonth(), clubs: true, events: true, classes: true }).get(iso) || [])
    .slice()
    .sort((a, b) => a.startMin - b.startMin)
  const mins = now.getHours() * 60 + now.getMinutes()
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm md:col-span-2" aria-labelledby="today">
      <div className="flex items-baseline gap-3">
        <h2 id="today" className="text-xl font-extrabold tracking-tight">Today</h2>
        <span className="text-sm font-semibold text-muted-foreground">{now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-muted-foreground">Nothing is scheduled today.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map((x, i) => {
            const Icon = clubIcon(x.icon)?.Icon || KIND_DEFAULT[x.kind]
            const ink = ACTIVITY[x.kind].ink
            const tint = ACTIVITY[x.kind].tint
            return (
              <li
                key={i}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
                style={{ background: x.off ? STATUS.cancelled.tint : `color-mix(in oklab, ${tint} 55%, transparent)` }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: x.off ? STATUS.cancelled.ink : ink, color: '#fff' }}>
                  <Icon className="h-4.5 w-4.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className={'truncate font-bold ' + (x.off ? 'line-through opacity-70' : '')} dir="auto">{x.kind === 'class' ? 'English class ' + x.title : x.title}</div>
                  <div className="text-sm text-muted-foreground">{x.time ? x.time.replace(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/, (_m, a, b, c, d) => `${fmt12Min(+a * 60 + +b)} - ${fmt12Min(+c * 60 + +d)}`) : ''}{x.place ? ' · ' + (x.outside ? 'Outside: ' : x.moved ? 'Moved to ' : '') + x.place : ''}{x.off ? ' · cancelled' : ''}</div>
                </div>
                {!x.off && x.startMin <= mins && mins < x.startMin + 120 && <span className="rounded-full px-2.5 py-0.5 text-xs font-extrabold" style={{ background: ink, color: '#fff' }}>Now</span>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function RoomsNow({ now }: { now: Date }) {
  const state = useStore((s) => s.state)
  const mins = now.getHours() * 60 + now.getMinutes()
  const rooms = roomDayDetail(state, isoOf(now))
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm" aria-labelledby="rooms-now">
      <h2 id="rooms-now" className="flex items-center gap-2 text-xl font-extrabold tracking-tight"><DoorOpen className="h-5 w-5" aria-hidden /> Rooms right now</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {rooms.map((r) => {
          const cur = r.slots.find((s) => s.start <= mins && mins < s.end)
          const next = r.slots.find((s) => s.start > mins)
          let ink: string = STATUS.free.ink
          let text = next ? `Free until ${fmt12Min(next.start)}` : 'Free'
          if (r.closed) {
            ink = STATUS.closed.ink
            text = r.holiday ? 'Closed, ' + r.holiday : 'Not open today'
          } else if (cur) {
            ink = ACTIVITY[cur.kind].ink
            text = `In use until ${fmt12Min(cur.end)}`
          } else if (mins < 9 * 60 || mins >= 18 * 60) {
            ink = STATUS.closed.ink
            text = mins < 9 * 60 ? 'Opens at 9 AM' : 'Closed for today'
          }
          return (
            <li key={r.room} className="flex items-center gap-3">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: ink }} aria-hidden />
              <span className="flex-1 font-bold">{r.room}</span>
              <span className="text-sm font-semibold" style={{ color: ink }}>{text}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Legend() {
  const chips: [string, string][] = [
    [ACTIVITY.class.label, ACTIVITY.class.ink],
    [ACTIVITY.club.label, ACTIVITY.club.ink],
    [ACTIVITY.event.label, ACTIVITY.event.ink],
    [STATUS.free.label, STATUS.free.ink],
    [STATUS.cancelled.label, STATUS.cancelled.ink],
    [STATUS.closed.label, STATUS.closed.ink],
  ]
  return (
    <ul className="mt-4 flex flex-wrap items-center justify-center gap-2" aria-label="Colour key">
      {chips.map(([label, ink]) => (
        <li key={label} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm font-semibold">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: ink }} aria-hidden /> {label}
        </li>
      ))}
    </ul>
  )
}

export function DirectorPage() {
  const state = useStore((s) => s.state)
  const [tab, setTab] = React.useState<CalTab>('cluev')
  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(t)
  }, [])
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const updated = state._updated ? new Date(state._updated) : null
  const valid = !!updated && !Number.isNaN(updated.getTime())
  const fresh = valid && now.getTime() - updated!.getTime() < 36 * 3600 * 1000
  const changes = (state._changes || []).slice(0, 6)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="sticky top-3 z-40 px-3">
        <header className="aso-nav-glass mx-auto flex h-14 max-w-5xl items-center gap-2 rounded-full border border-border px-4 shadow-lg">
          <Logo size={30} />
          <div className="font-display hidden min-w-0 flex-1 truncate text-[16px] font-extrabold tracking-tight sm:block">American Space Oujda</div>
          <div className="flex-1 sm:hidden" />
          <nav className="flex items-center gap-1" aria-label="Sections">
            {[['today', 'Today'], ['calendar', 'Calendar'], ['updates', 'Updates']].map(([id, label]) => (
              <button key={id} onClick={() => jump(id)} className="rounded-full px-3 py-1.5 text-sm font-semibold text-foreground/80 transition hover:bg-secondary">{label}</button>
            ))}
          </nav>
          <ThemeToggle />
        </header>
      </div>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10 pt-8 text-[17px]">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">Calendar</h1>
            <p className="mt-2 text-muted-foreground">Everything that happens at the American Space, on one page.</p>
          </div>
          <button
            type="button"
            onClick={() => jump('updates')}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-secondary"
          >
            <span className="relative flex h-2.5 w-2.5">
              {fresh && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: STATUS.free.ink }} />}
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: fresh ? STATUS.free.ink : STATUS.closed.ink }} />
            </span>
            {valid ? `Updated ${ago(updated!, now)}` : 'Update time not recorded yet'}
          </button>
        </div>

        <div id="today" className="mt-6 grid scroll-mt-24 gap-4 md:grid-cols-3">
          <TodayCard now={now} />
          <RoomsNow now={now} />
        </div>

        <h2 id="calendar" className="mt-12 scroll-mt-24 text-2xl font-extrabold tracking-tight">The calendar</h2>
        <p className="mt-1 text-muted-foreground">Pick what to look at, then a month or a week. Hover the picture and it moves.</p>
        <div className="mt-4">
          <UnifiedCalendar tab={tab} onTab={setTab} />
        </div>
        <Legend />

        <section id="updates" className="mt-12 scroll-mt-24 rounded-3xl border border-border bg-card p-5 shadow-sm" aria-labelledby="updates-h">
          <h2 id="updates-h" className="flex items-center gap-2 text-xl font-extrabold tracking-tight"><History className="h-5 w-5" aria-hidden /> What changed</h2>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" aria-hidden />
            {valid ? (
              <span>Last updated <span className="font-semibold text-foreground">{updated!.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} at {updated!.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span></span>
            ) : (
              <span>It will show after the next change.</span>
            )}
          </div>
          {changes.length > 0 ? (
            <ol className="mt-4 flex flex-col gap-3 border-l-2 border-border pl-4">
              {changes.map((c, i) => (
                <li key={i} className="relative leading-snug">
                  <span className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card" style={{ background: ACTIVITY.club.ink }} aria-hidden />
                  <div className="font-semibold">{c.text}</div>
                  <div className="text-xs text-muted-foreground">{new Date(c.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, {new Date(c.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No changes recorded yet.</p>
          )}
        </section>
      </main>

      <SiteFooter current="public" />
    </div>
  )
}
