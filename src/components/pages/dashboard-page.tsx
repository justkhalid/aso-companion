'use client'

import * as React from 'react'
import { Send, AlertTriangle, Sparkles, UserX, ArrowRight, Ban, UserCheck, CalendarClock, Clock, Sun, GraduationCap, BookUser } from 'lucide-react'
import { useStore } from '@/lib/store'
import { DAY_KEYS } from '@/lib/constants'
import { PageHead, Chip } from '@/components/ui-bits'
import { peopleOf, rolesOf, fmtAbsenceRange, isoOf, nextOccurrence, termStatus, classStatusOn, clubStatusOn, clubWhere, eventStatusOn, eventWhere, isOnceEvent, fmtTime, parseSlot } from '@/lib/app-utils'
import { Button } from '@/components/ui/button'
import { openQuickAdd } from '@/components/admin/quick-add'
import { PostQueue } from '@/components/post-queue'
import { isClubOver, isClassOver } from '@/lib/archive'
import { UnifiedCalendar } from '@/components/unified-calendar'
import type { CalTab } from '@/components/calendar-switch'
import { postQueue } from '@/lib/post-queue'
import type { View } from '@/lib/types'

/* the admin's landing page: what needs attention today, today's sessions, and the way to every list */
export function DashboardPage() {
  const state = useStore((s) => s.state)
  const setView = useStore((s) => s.setView)
  const openSocial = useStore((s) => s.openSocial)
  const [calTab, setCalTab] = React.useState<CalTab>('cluev')
  const page = useStore((s) => s.homeTab)
  const setPage = (k: 'overview' | 'calendar') => useStore.setState({ homeTab: k })
  const [lib, setLib] = React.useState<{ available: boolean; connected: boolean; summary?: { total: number; thisMonth: number; cardsToPrint: number; noPhoto: number } } | null>(null)
  React.useEffect(() => {
    fetch('/api/members?summary=1', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then(setLib).catch(() => setLib(null))
  }, [])
  const toPost = React.useMemo(() => postQueue(state).length, [state])

  const now = new Date()
  const today = isoOf(now)
  const dayKey = DAY_KEYS[(now.getDay() + 6) % 7]
  const st = termStatus(state)
  const clubs = state.clubs.filter((c) => !isClubOver(c))
  const classes = state.classes.filter((c) => !isClassOver(c))

  const away = (state.absences || []).filter((a) => !a.moved && a.from <= today && a.to >= today)
  const awayName = (a: (typeof away)[number]) =>
    a.kind === 'club' ? state.clubs.find((c) => c.id === a.clubId)?.name || 'Club' : a.kind === 'event' ? state.events.find((e) => e.id === a.eventId)?.title || 'Event' : a.teacher

  /* everything on today, with its status */
  const sessions = [
    ...classes.filter((c) => (c.days || []).includes(dayKey)).map((c) => ({ key: c.id, title: c.code, sub: `${c.level} · ${c.teacher || 'no teacher'}`, time: c.time, room: c.room, status: classStatusOn(state, c, today) })),
    ...clubs.filter((c) => (c.days || []).includes(dayKey)).map((c) => ({ key: c.id, title: c.name, sub: `Club · ${c.lead || 'no lead'}`, time: clubWhere(state, c, today).time, room: clubWhere(state, c, today).place, status: clubStatusOn(state, c.id, today) })),
    ...state.events.filter((e) => (isOnceEvent(e) ? e.date === today : e.day === dayKey && !!nextOccurrence(e) && isoOf(nextOccurrence(e)!) === today)).map((e) => ({ key: e.id, title: e.title, sub: e.lead ? `Event · ${e.lead}` : 'Event', time: eventWhere(state, e, today).time, room: eventWhere(state, e, today).place, status: eventStatusOn(state, e.id, today) })),
  ].sort((a, b) => parseSlot(a.time || '').mins - parseSlot(b.time || '').mins)

  /* things that are missing */
  const todo = [
    ...clubs.filter((c) => !c.lead).map((c) => ({ text: `${c.name} has no lead`, view: 'intern-clubs' as View })),
    ...classes.filter((c) => !c.teacher).map((c) => ({ text: `${c.code} has no teacher`, view: 'classes' as View })),
    ...classes.filter((c) => !c.room).map((c) => ({ text: `${c.code} has no room`, view: 'classes' as View })),
    ...clubs.filter((c) => !c.poster && !c.placeholder).map((c) => ({ text: `${c.name} has no poster`, view: 'intern-clubs' as View })),
  ]

  /* the main numbers, in three groups */
  const people = peopleOf(state)
  const upcomingEvents = state.events.filter((e) => nextOccurrence(e)).length
  const libStats: { label: string; value: string | number; view: View }[] = lib?.connected && lib.summary
    ? [
        { label: 'Members', value: lib.summary.total, view: 'members' },
        { label: 'Joined this month', value: lib.summary.thisMonth, view: 'members' },
      ]
    : [{ label: 'Members', value: '-', view: 'members' }]
  const stats: { title: string; icon: React.ElementType; items: { label: string; value: string | number; view: View }[]; note?: string }[] = [
    { title: 'Clubs and events', icon: Sparkles, items: [
      { label: 'Clubs', value: clubs.length, view: 'intern-clubs' },
      { label: 'Upcoming events', value: upcomingEvents, view: 'intern-events' },
    ] },
    { title: 'Classes', icon: GraduationCap, items: [
      { label: 'Classes', value: classes.length, view: 'classes' },
      { label: 'Teachers', value: people.filter((p) => rolesOf(p).includes('Teacher')).length, view: 'team' },
    ] },
    { title: 'ASO Library', icon: BookUser, items: libStats, note: !lib ? undefined : !lib.available ? "Members open only in the app on the director's computer." : !lib.connected ? 'The members sheet is not connected yet. Open Members to connect it.' : undefined },
  ]

  /* one row of buttons for the jobs done most */
  type Job = { label: string; icon: React.ElementType; go: () => void; badge?: number }
  const jobs: Job[] = [
    { label: 'Share', icon: Send, go: () => openSocial('todo'), badge: toPost },
    { label: 'Scheduled posts', icon: Clock, go: () => openSocial('scheduled') },
    { label: 'Clubs', icon: Sparkles, go: () => setView('intern-clubs') },
    { label: 'Events', icon: CalendarClock, go: () => setView('intern-events') },
    { label: 'Report an absence', icon: UserX, go: () => openQuickAdd('absence') },
  ]

  const week = st.mode === 's1' || st.mode === 's2' ? `Week ${st.week}` : st.mode === 'before' ? `Year starts in ${st.daysTo} days` : st.mode === 'break' ? 'Winter break' : 'Year complete'

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <PageHead
        title="Home"
        subtitle={`${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · ${week}`}
      />

      <div className="mb-4 inline-flex rounded-full border border-border bg-secondary/70 p-0.5" role="tablist" aria-label="Home sections">
        {([['overview', 'Overview'], ['calendar', 'Calendar']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={page === k} onClick={() => setPage(k)} className={`h-9 rounded-full px-5 text-sm font-bold transition ${page === k ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{l}</button>
        ))}
      </div>

      {page === 'overview' ? (
        <>
      {/* 1. the main numbers */}
      <nav aria-label="Statistics" className="mb-4 grid gap-3 md:grid-cols-3">
        {stats.map((x) => (
          <section key={x.title} className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-tight"><x.icon className="h-4 w-4 text-primary" aria-hidden /> {x.title}</h2>
            <div className="mt-3 grid flex-1 grid-cols-2 gap-2">
              {x.items.map((t) => (
                <button key={t.label} onClick={() => setView(t.view)} className="rounded-xl bg-secondary/60 p-2.5 text-left transition hover:bg-secondary">
                  <span className="block text-xl font-extrabold leading-none tabular-nums">{t.value}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{t.label}</span>
                </button>
              ))}
            </div>
            {x.note && <p className="mt-3 text-xs text-muted-foreground">{x.note}</p>}
          </section>
        ))}
      </nav>

      {/* 2. today, and what needs her */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <section aria-label="Today" className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold tracking-tight"><Sun className="h-4 w-4 text-primary" aria-hidden /> Today</h2>

          <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Sessions</h3>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing is scheduled today.</p>
          ) : (
            <ul className="divide-y divide-border">
              {sessions.map((x) => (
                <li key={x.key} className={`flex flex-col gap-x-3 gap-y-0.5 py-2 text-sm sm:flex-row sm:flex-wrap sm:items-center ${x.status.kind === 'canceled' ? 'opacity-60' : ''}`}>
                  <span className="shrink-0 font-semibold tabular-nums sm:w-32">{fmtTime(x.time) || '-'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-bold">{x.title}</span> <span className="text-muted-foreground">{x.sub}</span>
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">{x.room}</span>
                  {x.status.kind === 'canceled' && <Chip tone="gold" icon={Ban}>Canceled</Chip>}
                  {x.status.kind === 'cover' && <Chip tone="primary" icon={UserCheck}>Cover: {x.status.cover}</Chip>}
                </li>
              ))}
            </ul>
          )}

          <h3 className="mb-1.5 mt-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Away</h3>
          {away.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody is away.</p>
          ) : (
            <ul className="grid gap-2">
              {away.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-bold">{awayName(a)}</span>
                  <Chip tone={a.cover ? 'primary' : 'gold'} icon={a.cover ? UserCheck : Ban}>{a.cover ? `Covered by ${a.cover}` : 'Canceled'}</Chip>
                  <span className="text-muted-foreground">{fmtAbsenceRange(a)} · {a.reason}</span>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setView('absences')} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
            All absences <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>

        </section>

        <section aria-label="Needs you" className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold tracking-tight"><AlertTriangle className="h-4 w-4 text-[var(--aso-gold)]" aria-hidden /> Needs you</h2>
          <PostQueue compact />
          {todo.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nothing is missing.</p>
          ) : (
            <ul className="mt-2 grid gap-1.5">
              {todo.slice(0, 6).map((t, i) => (
                <li key={i}>
                  <button onClick={() => setView(t.view)} className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-sm hover:bg-secondary">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--aso-gold)]" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{t.text}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
              {todo.length > 6 && <li className="px-1 text-xs text-muted-foreground">and {todo.length - 6} more</li>}
            </ul>
          )}
        </section>
      </div>

      {/* 3. the jobs done most, in one row */}
      <nav aria-label="Shortcuts" className="mb-4 flex flex-wrap gap-2">
        {jobs.map((j) => (
          <button key={j.label} onClick={j.go} className="relative inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-bold shadow-sm transition hover:border-primary/40 hover:bg-secondary">
            <j.icon className="h-4 w-4 text-primary" aria-hidden /> {j.label}
            {!!j.badge && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-extrabold leading-none text-primary-foreground">{j.badge}</span>}
          </button>
        ))}
      </nav>

        </>
      ) : (
        <>
      {/* 4. the calendar, editable: tap a session to edit it, drag it to move it */}
      <section aria-label="Calendar" className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <UnifiedCalendar tab={calTab} onTab={setCalTab} />
      </section>
        </>
      )}
    </div>
  )
}
