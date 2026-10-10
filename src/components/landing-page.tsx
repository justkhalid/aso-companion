'use client'

import * as React from 'react'
import { CalendarDays, ChevronRight, Clock, Download, GraduationCap, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadClubsPng } from '@/lib/clubs-sheet'
import { Logo } from './logo'
import { SiteFooter } from './site-footer'
import { ThemeToggle } from './theme-toggle'
import { ClubExpandOverlay, ClubGridCard, EventCard } from './pages/clubs-page'
import { useStore } from '@/lib/store'
import { BANDS, DAY_FULL, DAY_KEYS, FILL_GRID } from '@/lib/constants'
import { mondayOfWeek, nextOccurrence, toneClassForClub, fmtTime } from '@/lib/app-utils'
import { PUBLIC_CLASS_TONE, publicClassItems, publicClubItems, publicEventItems } from '@/lib/calendar-items'
import { CalendarCardsView, CalendarListView, CalViewSwitcher, WeeklyGrid, readCalView, writeCalView, type CalendarView, type LegendEntry } from './weekly-grid'
import { cn } from '@/lib/utils'
import type { Club } from '@/lib/types'

/* /: the main page for the general public. What is on offer at American Space Oujda:
   the English classes (with their days and times), the clubs and the coming events.
   No teacher names, class codes or admin tools. Teachers and interns have their own pages. */

const SECTIONS = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'clubs', label: 'Clubs' },
  { id: 'events', label: 'Events' },
  { id: 'classes', label: 'Classes' },
]

const dayOrder = (d: string) => DAY_KEYS.indexOf(d as (typeof DAY_KEYS)[number])
const firstSentence = (s: string) => {
  const m = /^.*?[.!?](\s|$)/.exec(s || '')
  return (m ? m[0] : s || '').trim()
}

export function LandingPage() {
  const state = useStore((s) => s.state)
  const admin = useStore((s) => s.admin)
  const pubView = useStore((s) => s.pubView)
  const setView = useStore((s) => s.setView)
  const setPubView = useStore((s) => s.setPubView)
  const [expanded, setExpanded] = React.useState<Club | null>(null)
  const [calView, setCalView] = React.useState<CalendarView>('grid')
  const [calKind, setCalKind] = React.useState<'all' | 'classes' | 'clubs' | 'events'>('all')
  React.useEffect(() => { setCalView(readCalView()) }, [])
  React.useEffect(() => { writeCalView(calView) }, [calView])

  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  /* levels that actually run this year, grouped by age band */
  const levels = state.levels
    .map((l) => ({
      level: l,
      sessions: state.classes
        .filter((c) => c.level === l.label && (c.days || []).length && c.time)
        .map((c) => ({ id: c.id, days: [...c.days].sort((a, b) => dayOrder(a) - dayOrder(b)), time: c.time }))
        .sort((a, b) => dayOrder(a.days[0]) - dayOrder(b.days[0]) || a.time.localeCompare(b.time))
        /* two groups at the same time read as one line with a count */
        .reduce<{ id: string; days: string[]; time: string; groups: number }[]>((acc, s) => {
          const same = acc.find((x) => x.time === s.time && x.days.join() === s.days.join())
          if (same) same.groups += 1
          else acc.push({ ...s, groups: 1 })
          return acc
        }, []),
    }))
    .filter((x) => x.sessions.length > 0)
  const bands = BANDS.map((b) => ({ band: b, items: levels.filter((x) => x.level.band === b) })).filter((x) => x.items.length)

  const clubs = [...state.clubs].sort((a, b) => dayOrder((a.days || [])[0] || 'Sun') - dayOrder((b.days || [])[0] || 'Sun'))
  const events = (state.events || [])
    .map((e) => ({ e, d: nextOccurrence(e) }))
    .filter((x) => x.d)
    .sort((a, b) => a.d!.getTime() - b.d!.getTime())

  /* everything this week in one calendar: classes by level, clubs, events */
  const monday = mondayOfWeek(new Date())
  const clubItems = publicClubItems(state, monday)
  const eventItems = publicEventItems(state, monday)
  const classItems = publicClassItems(state, monday)
  const calItems = [
    ...(calKind === 'all' || calKind === 'clubs' ? clubItems : []),
    ...(calKind === 'all' || calKind === 'events' ? eventItems : []),
    ...(calKind === 'all' || calKind === 'classes' ? classItems : []),
  ]
  const calLegend: LegendEntry[] = [
    ...(calKind === 'all' || calKind === 'clubs' ? state.clubs.filter((c) => (c.days || []).length && c.time).map((c) => ({ label: c.name, tone: toneClassForClub(state, c.id) })) : []),
    ...(calItems.some((i) => i.tone === 'tone-7') ? [{ label: 'Special events', tone: 'tone-7' }] : []),
    ...(calItems.some((i) => i.tone === PUBLIC_CLASS_TONE) ? [{ label: 'English classes', tone: PUBLIC_CLASS_TONE }] : []),
    ...(calItems.some((i) => i.tone === 'tone-8') ? [{ label: 'Cancelled', tone: 'tone-8' }] : []),
  ]

  const stat = (n: number, label: string) => (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 text-center shadow-sm">
      <div className="text-2xl font-extrabold tabular-nums">{n}</div>
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {admin && pubView && (
        <div className="border-b border-primary/20 bg-primary/5">
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
            <span className="text-xs font-semibold text-primary">Public view · signed in as admin</span>
            <button onClick={() => { setPubView(false); setView('dashboard') }} className="ml-auto text-xs font-bold text-primary hover:underline">Open admin menu</button>
          </div>
        </div>
      )}

      <header className="aso-nav-glass sticky top-0 z-40 border-b border-border">
        <div className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Logo size={30} />
            <div className="font-display truncate text-[16px] font-extrabold tracking-tight">American Space Oujda</div>
          </div>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => jump(s.id)} className="rounded-full px-3.5 py-1.5 text-sm font-semibold text-foreground/80 transition hover:bg-secondary">
                {s.label}
              </button>
            ))}
          </nav>
          <div className="col-start-3 flex justify-end"><ThemeToggle /></div>
        </div>
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => jump(s.id)} className="shrink-0 rounded-full bg-secondary px-3.5 py-1.5 text-sm font-semibold text-foreground/80">
              {s.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1">
        {/* hero */}
        <section className="mx-auto max-w-6xl px-4 pb-6 pt-12 text-center sm:pt-16">
          <h1 className="font-display mx-auto max-w-3xl text-balance text-[34px] font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            American Space Oujda
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
            English for kids, teens and adults. Everything on offer this year: the clubs, the events and the classes.
          </p>
          <div className="mx-auto mt-7 grid max-w-lg grid-cols-3 gap-3">
            {stat(clubs.length, clubs.length === 1 ? 'club' : 'clubs')}
            {stat(events.length, events.length === 1 ? 'event' : 'events')}
            {stat(state.classes.filter((c) => (c.days || []).length && c.time && levels.some((x) => x.level.label === c.level)).length, 'class groups')}
          </div>
        </section>

        {/* the way in for teachers, interns and volunteers (the admin can switch it off in Settings) */}
        {state.settings.showAccessBox !== false && (
          <section className="mx-auto max-w-6xl px-4 pb-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-extrabold tracking-tight">Are you a teacher, an intern or a volunteer?</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Access your dedicated pages here.{state.settings.teacherLoginRequired === false && state.settings.internLoginRequired === false ? '' : ' You will need the access code you were given.'}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: GraduationCap, title: 'Teachers', text: 'Weekly plans, the library and the class calendar', go: () => setView('home') },
                  { icon: Sparkles, title: 'Interns and volunteers', text: 'Clubs, events and which rooms are free', go: () => setView('intern-public') },
                ].map((t) => (
                  <button
                    key={t.title}
                    onClick={t.go}
                    className="group flex items-center gap-3.5 rounded-2xl border border-border bg-secondary/40 p-4 text-left transition hover:border-primary/40 hover:bg-secondary active:scale-[0.99]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <t.icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold leading-tight">{t.title}</span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{t.text}</span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* the whole week in one calendar */}
        <section id="calendar" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-8">
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-extrabold tracking-tight">This week at ASO</h2>
              <p className="text-sm text-muted-foreground">Classes, clubs and events on one calendar.</p>
            </div>
            <CalViewSwitcher view={calView} onChange={setCalView} />
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Show on the calendar">
            {([['all', 'All'], ['classes', 'Classes'], ['clubs', 'Clubs'], ['events', 'Events']] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setCalKind(k)}
                aria-pressed={calKind === k}
                className={'rounded-full px-3.5 py-1.5 text-sm font-semibold transition ' + (calKind === k ? 'aso-nav-pill shadow-sm' : 'bg-secondary text-foreground/80 hover:bg-secondary/70')}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="rounded-2xl bg-card">
            {calView === 'grid' ? (
              <WeeklyGrid items={calItems} legend={calLegend} weekMonday={monday} emptyMessage="Nothing scheduled yet" />
            ) : calView === 'cards' ? (
              <CalendarCardsView items={calItems} legend={calLegend} weekMonday={monday} emptyMessage="Nothing scheduled yet" />
            ) : (
              <CalendarListView items={calItems} legend={calLegend} weekMonday={monday} emptyMessage="Nothing scheduled yet" />
            )}
          </div>
        </section>

        {/* clubs */}
        <section id="clubs" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-8">
          <div className="mb-5 flex flex-wrap items-end gap-x-3 gap-y-2">
            <div className="min-w-0 flex-1">
              <h2 className="mb-1 text-xl font-extrabold tracking-tight">Clubs</h2>
              <p className="text-sm text-muted-foreground">Weekly clubs run by our volunteers. Tap a club to see the details.</p>
            </div>
            {clubs.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => { void downloadClubsPng(state) }}>
                <Download className="h-4 w-4" aria-hidden /> Download all clubs (PNG)
              </Button>
            )}
          </div>
          {clubs.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Clubs will be listed here soon.</div>
          ) : (
            <div className="flex flex-wrap justify-center gap-3">
              {clubs.map((c) => (
                <div key={c.id} className="flex w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]">
                  <ClubGridCard club={c} admin={false} onExpand={() => setExpanded(c)} onEdit={() => {}} onDelete={() => {}} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* events */}
        <section id="events" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-8">
          <h2 className="mb-1 text-xl font-extrabold tracking-tight">Events</h2>
          <p className="mb-5 text-sm text-muted-foreground">What is coming up. Check the date and place before you come.</p>
          {events.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              <Sparkles className="mx-auto mb-2 h-5 w-5" /> No events are planned right now. Check back soon.
            </div>
          ) : (
            <div className="grid gap-3">
              {events.map(({ e, d }) => (
                <EventCard key={e.id} event={e} nextDate={d!} admin={false} onEdit={() => {}} onDelete={() => {}} />
              ))}
            </div>
          )}
        </section>
        {/* classes */}
        <section id="classes" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-8 pb-14">
          <h2 className="mb-1 text-xl font-extrabold tracking-tight">Classes</h2>
          <p className="mb-5 text-sm text-muted-foreground">English classes by age and level. Each class meets once or twice a week.</p>
          {bands.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Classes will be listed here soon.</div>
          ) : (
            bands.map(({ band, items }) => (
              <div key={band} className="mb-6">
                <div className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">{band}</div>
                <div className="grid gap-3" style={FILL_GRID}>
                  {items.map(({ level, sessions }) => (
                    <div key={level.key} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1 font-bold leading-tight">{level.label}</div>
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">{level.cefr}</span>
                      </div>
                      <p className="text-[13px] leading-relaxed text-muted-foreground">{firstSentence(level.desc || "")}</p>
                      <ul className="mt-auto flex flex-col gap-1.5 border-t border-border pt-3 text-[13px]">
                        {sessions.map((s) => (
                          <li key={s.id} className="flex items-center gap-2">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="font-semibold">{s.days.map((d) => DAY_FULL[d] || d).join(' and ')}</span>
                            {s.groups > 1 && <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground">{s.groups} groups</span>}
                            <span className="ml-auto inline-flex items-center gap-1 tabular-nums text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {fmtTime(s.time)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

      </main>

      <ClubExpandOverlay club={expanded} onClose={() => setExpanded(null)} admin={false} onEdit={() => {}} />

      <SiteFooter current="public" />
    </div>
  )
}
