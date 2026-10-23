'use client'

import * as React from 'react'
import { Send, AlertTriangle, Sparkles, UserX, Ban, UserCheck, CalendarDays, Sun, GraduationCap, Camera, CheckCircle2, ChevronRight } from 'lucide-react'
import { useStore } from '@/lib/store'
import { DAY_KEYS } from '@/lib/constants'
import { Chip } from '@/components/ui-bits'
import { peopleOf, fmtAbsenceRange, isoOf, nextOccurrence, termStatus, classStatusOn, clubStatusOn, clubWhere, eventStatusOn, eventWhere, isOnceEvent, fmtTime, parseSlot } from '@/lib/app-utils'
import { isClubOver, isClassOver } from '@/lib/archive'
import { UnifiedCalendar } from '@/components/unified-calendar'
import type { CalTab } from '@/components/calendar-switch'
import { postQueue } from '@/lib/post-queue'
import type { View } from '@/lib/types'
import { cn } from '@/lib/utils'

/*
  The admin's landing page. It answers three questions, in the order they are asked:

    1. What is happening today, and what is next?   -> the timeline
    2. What needs me?                                -> the ranked list
    3. What does the rest of the week look like?     -> the week strip

  Deliberately not a grid of number cards: "8 clubs, 3 events" is not something you
  act on at nine in the morning, and the sidebar already goes to every list, so the
  old row of shortcut buttons was the same five destinations a third time.
*/

type Action = {
  id: string
  text: string
  detail: string
  icon: React.ElementType
  urgent: boolean
  go: () => void
}

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

  const queue = React.useMemo(() => postQueue(state), [state])
  const now = new Date()
  const today = isoOf(now)
  const dayKey = DAY_KEYS[(now.getDay() + 6) % 7]
  const st = termStatus(state)
  /* the term's length, for the progress rail: the longest level decides */
  const total = state.levels.reduce((m, l) => Math.max(m, l.weeks.length), 0)
  const clubs = state.clubs.filter((c) => !isClubOver(c))
  const classes = state.classes.filter((c) => !isClassOver(c))

  const away = (state.absences || []).filter((a) => !a.moved && a.from <= today && a.to >= today)
  const awayName = (a: (typeof away)[number]) =>
    a.kind === 'club' ? state.clubs.find((c) => c.id === a.clubId)?.name || 'Club' : a.kind === 'event' ? state.events.find((e) => e.id === a.eventId)?.title || 'Event' : a.teacher

  /* ---- today, in time order, with a start minute so we know what has passed ---- */
  const sessions = [
    ...classes.filter((c) => (c.days || []).includes(dayKey)).map((c) => ({ key: c.id, title: c.code, sub: `${c.level} · ${c.teacher || 'no teacher'}`, time: c.time, room: c.room, status: classStatusOn(state, c, today), mins: parseSlot(c.time || '').mins })),
    ...clubs.filter((c) => (c.days || []).includes(dayKey)).map((c) => ({ key: c.id, title: c.name, sub: `Club · ${c.lead || 'no lead'}`, time: clubWhere(state, c, today).time, room: clubWhere(state, c, today).place, status: clubStatusOn(state, c.id, today), mins: parseSlot(clubWhere(state, c, today).time || '').mins })),
    ...state.events.filter((e) => (isOnceEvent(e) ? e.date === today : e.day === dayKey && !!nextOccurrence(e) && isoOf(nextOccurrence(e)!) === today)).map((e) => ({ key: e.id, title: e.title, sub: e.lead ? `Event · ${e.lead}` : 'Event', time: eventWhere(state, e, today).time, room: eventWhere(state, e, today).place, status: eventStatusOn(state, e.id, today), mins: parseSlot(eventWhere(state, e, today).time || '').mins })),
  ].sort((a, b) => a.mins - b.mins)

  const nowMins = now.getHours() * 60 + now.getMinutes()
  /* the first session that has not started yet, and is not canceled: the one to point at */
  const nextIdx = sessions.findIndex((s) => s.mins >= nowMins && s.status.kind !== 'canceled')
  const remaining = sessions.filter((s) => s.mins >= nowMins && s.status.kind !== 'canceled').length

  /* ---- the next seven days, counted ---- */
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const key = DAY_KEYS[(d.getDay() + 6) % 7]
    const iso = isoOf(d)
    const n =
      classes.filter((c) => (c.days || []).includes(key)).length +
      clubs.filter((c) => (c.days || []).includes(key) && (!c.from || c.from <= iso) && (!c.until || c.until >= iso)).length +
      state.events.filter((e) => (isOnceEvent(e) ? e.date === iso : e.day === key)).length
    return { iso, label: d.toLocaleDateString('en-GB', { weekday: 'short' }), dayNum: d.getDate(), n, today: i === 0 }
  })
  const busiest = Math.max(1, ...week.map((d) => d.n))

  /* ---- what needs her, urgent first ---- */
  const uncovered = away.filter((a) => !a.cover).length
  const noTeacher = classes.filter((c) => !c.teacher).length
  const noRoom = classes.filter((c) => !c.room).length
  const noLead = clubs.filter((c) => !c.lead).length
  const noPoster = clubs.filter((c) => !c.poster && !c.placeholder).length

  const actions: Action[] = []
  if (queue.length) actions.push({ id: 'posts', text: `${queue.length} ${queue.length === 1 ? 'post' : 'posts'} to publish`, detail: 'Coming up, and not posted yet', icon: Send, urgent: true, go: () => openSocial('todo') })
  if (uncovered) actions.push({ id: 'cover', text: `${uncovered} ${uncovered === 1 ? 'session is' : 'sessions are'} canceled today with no cover`, detail: 'Someone is away and nobody replaces them', icon: UserX, urgent: true, go: () => setView('absences') })
  if (noTeacher) actions.push({ id: 'teachers', text: `${noTeacher} ${noTeacher === 1 ? 'class has' : 'classes have'} no teacher`, detail: 'Set one in Classes', icon: GraduationCap, urgent: false, go: () => setView('classes') })
  if (noRoom) actions.push({ id: 'rooms', text: `${noRoom} ${noRoom === 1 ? 'class has' : 'classes have'} no room`, detail: 'Set one in Classes', icon: GraduationCap, urgent: false, go: () => setView('classes') })
  if (noLead) actions.push({ id: 'leads', text: `${noLead} ${noLead === 1 ? 'club has' : 'clubs have'} no lead`, detail: 'Set one in Clubs', icon: Sparkles, urgent: false, go: () => setView('intern-clubs') })
  if (noPoster) actions.push({ id: 'posters', text: `${noPoster} ${noPoster === 1 ? 'club has' : 'clubs have'} no poster`, detail: 'The story falls back to a plain card', icon: Camera, urgent: false, go: () => setView('intern-clubs') })

  const glance = [
    { value: classes.length, label: classes.length === 1 ? 'class' : 'classes', view: 'classes' as View },
    { value: clubs.length, label: clubs.length === 1 ? 'club' : 'clubs', view: 'intern-clubs' as View },
    { value: state.events.filter((e) => nextOccurrence(e)).length, label: 'events coming', view: 'intern-events' as View },
    { value: peopleOf(state).length, label: 'people', view: 'team' as View },
    ...(lib?.connected && lib.summary ? [{ value: lib.summary.total, label: 'members', view: 'members' as View }] : []),
  ]

  const inTerm = st.mode === 's1' || st.mode === 's2'
  const weekNo = inTerm ? (st.week ?? 0) : 0
  const weekLabel =
    inTerm ? `Week ${weekNo} of ${total}` :
    st.mode === 'before' ? `Year starts in ${st.daysTo} days` :
    st.mode === 'break' ? `Winter break · S2 in ${st.daysTo} days` : 'Year complete'
  const pct = inTerm ? Math.min(100, Math.round((weekNo / Math.max(1, total)) * 100)) : 100

  const pulse = [
    sessions.length === 0 ? 'Nothing scheduled today' : `${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'} today`,
    remaining > 0 && sessions.length !== remaining ? `${remaining} still to come` : '',
    away.length ? `${away.length} away` : '',
    queue.length ? `${queue.length} to post` : '',
  ].filter(Boolean).join(' · ')

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {/* ---- the day, and where the year is ---- */}
      <header className="mb-5 flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight">
            {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{pulse}</p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="w-60">
            <div className="flex items-baseline justify-between gap-2 text-[11px] font-bold">
              <span className="text-muted-foreground">{weekLabel}</span>
              {(st.mode === 's1' || st.mode === 's2') && <span className="tabular-nums text-muted-foreground">{pct}%</span>}
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary" role="img" aria-label={weekLabel}>
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            {st.mode === 'break' && <p className="mt-1 text-[11px] text-muted-foreground">Semester 2 starts in {st.daysTo} days</p>}
          </div>

          <div className="inline-flex rounded-full border border-border bg-card p-1" role="group" aria-label="Home sections">
            {([['overview', 'Today'], ['calendar', 'Calendar']] as const).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setPage(k)}
                aria-pressed={page === k}
                className={cn('rounded-full px-4 py-1 text-[12.5px] font-bold transition outline-none focus-visible:ring-2 focus-visible:ring-ring', page === k ? 'aso-nav-pill' : 'text-foreground/70 hover:bg-secondary')}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>

      {page === 'calendar' ? (
        <section aria-label="Calendar" className="rounded-2xl border border-border bg-card p-4">
          <UnifiedCalendar tab={calTab} onTab={setCalTab} />
        </section>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start">
            {/* ---- 1. the day, as a line you can read down ---- */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-tight"><Sun className="h-4 w-4 text-primary" aria-hidden /> Today</h2>
                <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                  {sessions.length === 0 ? 'empty' : `${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'}`}
                </span>
              </div>

              {sessions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Nothing is scheduled for today.
                </p>
              ) : (
                <ol>
                  {sessions.map((s, i) => {
                    const past = s.mins < nowMins
                    const isNext = i === nextIdx
                    return (
                      <li key={s.key} className={cn('flex gap-3', i === sessions.length - 1 ? 'pb-0' : 'pb-3', past && !isNext && 'opacity-55')}>
                        <span className="w-11 shrink-0 pt-0.5 text-right text-[11px] font-bold tabular-nums text-muted-foreground">{fmtTime(s.time) || '—'}</span>
                        <span className="relative flex w-3 shrink-0 justify-center pt-1.5">
                          <span className={cn('z-10 h-2.5 w-2.5 rounded-full ring-2 ring-card', isNext ? 'bg-primary' : past ? 'bg-border' : 'bg-foreground/25')} />
                          {i < sessions.length - 1 && <span className="absolute top-3.5 h-full w-px bg-border" aria-hidden />}
                        </span>
                        <span className="min-w-0 flex-1 pb-0.5">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className={cn('text-[13.5px] font-bold leading-tight', s.status.kind === 'canceled' && 'line-through decoration-2')}>{s.title}</span>
                            {isNext && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-primary-foreground">Next</span>}
                            {s.status.kind === 'canceled' && <Chip tone="gold" icon={Ban}>Canceled</Chip>}
                            {s.status.kind === 'cover' && <Chip tone="primary" icon={UserCheck}>Cover: {s.status.cover}</Chip>}
                          </span>
                          <span className="mt-0.5 flex flex-wrap gap-x-1.5 text-[11.5px] text-muted-foreground">
                            <span>{s.sub}</span>
                            {s.room && <><span aria-hidden>·</span><span>{s.room}</span></>}
                          </span>
                        </span>
                      </li>
                    )
                  })}
                </ol>
              )}

              {sessions.length > 0 && nextIdx === -1 && (
                <p className="mt-3 flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--aso-ok)]" aria-hidden /> That is everything for today.
                </p>
              )}

              {away.length > 0 && (
                <div className="mt-5 border-t border-border pt-4">
                  <h3 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Away today</h3>
                  <ul className="flex flex-col gap-1.5">
                    {away.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                        <span className="font-bold">{awayName(a)}</span>
                        <Chip tone={a.cover ? 'primary' : 'gold'} icon={a.cover ? UserCheck : Ban}>{a.cover ? `Covered by ${a.cover}` : 'No cover'}</Chip>
                        <span className="text-muted-foreground">{fmtAbsenceRange(a)} · {a.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* ---- 2. what needs her, urgent first ---- */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-tight">
                  <AlertTriangle className={cn('h-4 w-4', actions.length ? 'text-[var(--aso-gold)]' : 'text-muted-foreground')} aria-hidden /> Needs you
                </h2>
                {actions.length > 0 && <span className="rounded-full bg-[var(--aso-gold-tint)] px-2 py-0.5 text-[11px] font-extrabold text-[var(--aso-gold)] tabular-nums">{actions.length}</span>}
              </div>

              {actions.length === 0 ? (
                <p className="flex items-start gap-2 rounded-xl bg-[var(--aso-ok-tint)] p-3 text-[13px] font-semibold text-[var(--aso-ok)]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Everything is set: nothing to post, nobody away, every club and class complete.
                </p>
              ) : (
                <ul className="-mx-2 flex flex-col">
                  {actions.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={a.go}
                        className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left outline-none transition hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full', a.urgent ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground')}>
                          <a.icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-bold leading-tight">{a.text}</span>
                          <span className="block text-[11px] leading-tight text-muted-foreground">{a.detail}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ---- 3. the week, at a glance ---- */}
          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-tight"><CalendarDays className="h-4 w-4 text-primary" aria-hidden /> Next seven days</h2>
              <button type="button" onClick={() => setPage('calendar')} className="text-xs font-bold text-primary hover:underline">Open the calendar</button>
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {week.map((d) => (
                <button
                  key={d.iso}
                  type="button"
                  onClick={() => setPage('calendar')}
                  aria-label={`${d.label} ${d.dayNum}: ${d.n} ${d.n === 1 ? 'session' : 'sessions'}`}
                  className={cn('flex flex-col items-center gap-1.5 rounded-xl border p-2 outline-none transition focus-visible:ring-2 focus-visible:ring-ring', d.today ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-secondary')}
                >
                  <span className={cn('text-[10.5px] font-bold uppercase tracking-wider', d.today ? 'text-primary' : 'text-muted-foreground')}>{d.label}</span>
                  <span className="flex h-14 w-full items-end justify-center">
                    <span
                      className={cn('w-full max-w-7 rounded-t-md', d.today ? 'bg-primary' : 'bg-primary/25')}
                      style={{ height: `${d.n === 0 ? 3 : Math.max(10, (d.n / busiest) * 56)}px` }}
                    />
                  </span>
                  <span className={cn('text-xs font-extrabold tabular-nums', d.n === 0 && 'text-muted-foreground/50')}>{d.n}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ---- 4. the numbers, smaller than they used to be ---- */}
          <nav aria-label="At a glance" className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2">
            {glance.map((g) => (
              <button
                key={g.label}
                type="button"
                onClick={() => setView(g.view)}
                className="inline-flex items-baseline gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[12px] outline-none transition hover:border-primary/40 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="font-extrabold tabular-nums">{g.value}</span>
                <span className="font-semibold text-muted-foreground">{g.label}</span>
              </button>
            ))}
            {!lib?.available && lib !== null && (
              <span className="text-[11px] text-muted-foreground">Members open in the app on the director&apos;s computer.</span>
            )}
          </nav>
        </>
      )}
    </div>
  )
}
