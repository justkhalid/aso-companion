'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { SiteFooter } from '@/components/site-footer'
import { WeeklyGrid, type LegendEntry } from '@/components/weekly-grid'
import { RoomsPage } from '@/components/pages/rooms-page'
import { PUBLIC_CLASS_TONE, publicClassItems } from '@/lib/calendar-items'
import { MonthCalendarImage } from '@/components/month-calendar-image'
import { CalendarSwitch, type CalTab } from '@/components/calendar-switch'
import { mondayOfWeek } from '@/lib/app-utils'
import { Button } from '@/components/ui/button'

/* /calendar: written plainly. When the information was last updated, the calendar (the month picture, a switch to the classes),
   and which rooms are free. No sign-in, nothing to click except the arrows. */

function ago(then: Date, now: Date): string {
  const min = Math.round((now.getTime() - then.getTime()) / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

export function DirectorPage() {
  const state = useStore((s) => s.state)
  const [monday, setMonday] = React.useState(() => mondayOfWeek(new Date()))
  const shift = (n: number) => setMonday((m) => { const d = new Date(m); d.setDate(d.getDate() + n * 7); return d })
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const range = monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) + ' to ' + sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const isThisWeek = mondayOfWeek(new Date()).getTime() === monday.getTime()

  const [tab, setTab] = React.useState<CalTab>('cluev')
  const items = publicClassItems(state, monday)
  const legend: LegendEntry[] = [
    { label: 'English classes', tone: PUBLIC_CLASS_TONE },
    ...(items.some((i) => i.tone === 'tone-8') ? [{ label: 'Cancelled', tone: 'tone-8' }] : []),
  ]
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const updated = state._updated ? new Date(state._updated) : null
  const valid = updated && !Number.isNaN(updated.getTime())
  const now = new Date()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="aso-nav-glass sticky top-0 z-40 border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <Logo size={30} />
          <div className="font-display min-w-0 flex-1 truncate text-[16px] font-extrabold tracking-tight">American Space Oujda</div>
          <nav className="flex items-center gap-1" aria-label="Sections">
            {[['calendar', 'Calendar'], ['updated', 'Last updated'], ['rooms', 'Free rooms']].map(([id, label]) => (
              <button key={id} onClick={() => jump(id)} className="rounded-full px-3 py-1.5 text-sm font-semibold text-foreground/80 transition hover:bg-secondary">{label}</button>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 text-[17px]">
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Calendar</h1>
        <p className="mt-2 text-muted-foreground">Everything that happens at the American Space, on one page. Use the arrows to move between weeks.</p>

        {/* when it was last updated */}
        <div id="updated" className="mt-6 scroll-mt-20 flex items-start gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Clock className="h-6 w-6" aria-hidden /></div>
          <div className="min-w-0">
            <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Last updated</div>
            {valid ? (
              <>
                <div className="text-2xl font-extrabold leading-tight">
                  {updated!.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} at {updated!.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </div>
                <div className="mt-0.5 text-muted-foreground">{ago(updated!, now)}</div>
              </>
            ) : (
              <div className="text-lg font-semibold">The time of the last update is not recorded yet. It will show here after the next change.</div>
            )}
          </div>
        </div>

        {/* the calendar: the month picture first, a switch to the classes */}
        <h2 id="calendar" className="mt-10 scroll-mt-20 text-2xl font-extrabold tracking-tight">1. The calendar</h2>
        <div className="mt-3"><CalendarSwitch tab={tab} onChange={setTab} large /></div>
        {tab === 'cluev' ? (
          <div className="mt-4">
            <MonthCalendarImage clubs events classes={false} />
          </div>
        ) : (
          <>
            <p className="mt-3 text-muted-foreground">English classes. Grey means a class will not take place.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="lg" onClick={() => shift(-1)}><ChevronLeft className="h-5 w-5" aria-hidden /> Previous week</Button>
              <Button variant={isThisWeek ? 'default' : 'outline'} size="lg" onClick={() => setMonday(mondayOfWeek(new Date()))}>This week</Button>
              <Button variant="outline" size="lg" onClick={() => shift(1)}>Next week <ChevronRight className="h-5 w-5" aria-hidden /></Button>
              <div className="w-full text-lg font-bold sm:ml-2 sm:w-auto" aria-live="polite">{range}</div>
            </div>
            <div className="mt-3 rounded-2xl bg-card">
              <WeeklyGrid items={items} legend={legend} weekMonday={monday} emptyMessage="No classes this week" />
            </div>
          </>
        )}

        {/* free rooms */}
        <h2 id="rooms" className="mt-12 scroll-mt-20 text-2xl font-extrabold tracking-tight">2. Which rooms are free</h2>
        <p className="mt-1 text-muted-foreground">Each room, hour by hour. The coloured blocks are in use, the empty space is free. Use the arrows to change the week.</p>
        <div className="mt-3">
          <RoomsPage embedded />
        </div>
      </main>

      <SiteFooter current="public" />
    </div>
  )
}
