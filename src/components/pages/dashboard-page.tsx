'use client'

import * as React from 'react'
import { Send, BookUser, AlertTriangle, GraduationCap, Sparkles, UserX, ArrowRight, Ban, UserCheck } from 'lucide-react'
import { useStore } from '@/lib/store'
import { DAY_KEYS } from '@/lib/constants'
import { PageHead, Chip } from '@/components/ui-bits'
import { peopleOf, rolesOf, fmtAbsenceRange, isoOf, nextOccurrence, termStatus, classStatusOn, clubStatusOn, clubWhere, eventStatusOn, eventWhere, isOnceEvent, fmtTime, parseSlot } from '@/lib/app-utils'
import { Button } from '@/components/ui/button'
import { openQuickAdd } from '@/components/admin/quick-add'
import { CalendarSwitch, type CalTab } from '@/components/calendar-switch'
import { PostQueue } from '@/components/post-queue'
import { MonthCalendarImage } from '@/components/month-calendar-image'
import type { View } from '@/lib/types'

/* the admin's landing page: what needs attention today, today's sessions, and the way to every list */
export function DashboardPage() {
  const state = useStore((s) => s.state)
  const setView = useStore((s) => s.setView)
  const [calTab, setCalTab] = React.useState<CalTab>('cluev')
  const [lib, setLib] = React.useState<{ available: boolean; connected: boolean; summary?: { total: number; thisMonth: number; cardsToPrint: number; noPhoto: number } } | null>(null)
  React.useEffect(() => {
    fetch('/api/members?summary=1', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then(setLib).catch(() => setLib(null))
  }, [])

  const now = new Date()
  const today = isoOf(now)
  const dayKey = DAY_KEYS[(now.getDay() + 6) % 7]
  const st = termStatus(state)

  const away = (state.absences || []).filter((a) => !a.moved && a.from <= today && a.to >= today)
  const awayName = (a: (typeof away)[number]) =>
    a.kind === 'club' ? state.clubs.find((c) => c.id === a.clubId)?.name || 'Club' : a.kind === 'event' ? state.events.find((e) => e.id === a.eventId)?.title || 'Event' : a.teacher

  /* everything on today, with its status */
  const sessions = [
    ...state.classes.filter((c) => (c.days || []).includes(dayKey)).map((c) => ({ key: c.id, title: c.code, sub: `${c.level} · ${c.teacher || 'no teacher'}`, time: c.time, room: c.room, status: classStatusOn(state, c, today) })),
    ...state.clubs.filter((c) => (c.days || []).includes(dayKey)).map((c) => ({ key: c.id, title: c.name, sub: `Club · ${c.lead || 'no lead'}`, time: clubWhere(state, c, today).time, room: clubWhere(state, c, today).place, status: clubStatusOn(state, c.id, today) })),
    ...state.events.filter((e) => (isOnceEvent(e) ? e.date === today : e.day === dayKey && !!nextOccurrence(e) && isoOf(nextOccurrence(e)!) === today)).map((e) => ({ key: e.id, title: e.title, sub: e.lead ? `Event · ${e.lead}` : 'Event', time: eventWhere(state, e, today).time, room: eventWhere(state, e, today).place, status: eventStatusOn(state, e.id, today) })),
  ].sort((a, b) => parseSlot(a.time || '').mins - parseSlot(b.time || '').mins)

  /* things that are missing */
  const todo = [
    ...state.clubs.filter((c) => !c.lead).map((c) => ({ text: `${c.name} has no lead`, view: 'intern-clubs' as View })),
    ...state.classes.filter((c) => !c.teacher).map((c) => ({ text: `${c.code} has no teacher`, view: 'classes' as View })),
    ...state.classes.filter((c) => !c.room).map((c) => ({ text: `${c.code} has no room`, view: 'classes' as View })),
    ...state.clubs.filter((c) => !c.poster && !c.placeholder).map((c) => ({ text: `${c.name} has no poster`, view: 'intern-clubs' as View })),
  ]

  const people = peopleOf(state)
  const upcomingEvents = state.events.filter((e) => nextOccurrence(e)).length
  const libStats = lib?.connected && lib.summary
    ? [
        { label: 'Members', value: lib.summary.total, view: 'members' as View },
        { label: 'Joined this month', value: lib.summary.thisMonth, view: 'members' as View },
        { label: 'Cards to print', value: lib.summary.cardsToPrint, view: 'members' as View },
        { label: 'No photo', value: lib.summary.noPhoto, view: 'members' as View },
      ]
    : [{ label: 'Members', value: '-' as string | number, view: 'members' as View }]
  const sections: { title: string; icon: React.ElementType; stats: { label: string; value: string | number; view: View }[]; note?: string }[] = [
    {
      title: 'Clubs and events',
      icon: Sparkles,
      stats: [
        { label: 'Clubs', value: state.clubs.length, view: 'intern-clubs' },
        { label: 'Upcoming events', value: upcomingEvents, view: 'intern-events' },
        { label: 'On the calendar', value: state.clubs.length + upcomingEvents, view: 'clubs' },
        { label: 'Posters ready', value: state.clubs.filter((c) => !!c.poster).length + state.events.filter((e) => !!e.poster).length, view: 'social' },
      ],
    },
    {
      title: 'Classes',
      icon: GraduationCap,
      stats: [
        { label: 'Classes', value: state.classes.length, view: 'classes' },
        { label: 'Teachers', value: people.filter((p) => rolesOf(p).includes('Teacher')).length, view: 'team' },
        { label: 'Levels', value: state.levels.length, view: 'eltaso' },
        { label: 'Rooms', value: 4, view: 'rooms' },
      ],
    },
    {
      title: 'ASO Library',
      icon: BookUser,
      stats: libStats,
      note: !lib ? undefined : !lib.available ? 'Members open only in the app on the director\'s computer.' : !lib.connected ? 'The members sheet is not connected yet. Open Members to connect it.' : undefined,
    },
  ]

  const week = st.mode === 's1' || st.mode === 's2' ? `Week ${st.week}` : st.mode === 'before' ? `Year starts in ${st.daysTo} days` : st.mode === 'break' ? 'Winter break' : 'Year complete'

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <PageHead
        title="Dashboard"
        subtitle={`${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · ${week}`}
        right={
          <Button size="sm" onClick={() => openQuickAdd('absence')}>
            <UserX className="h-4 w-4" /> Report absence
          </Button>
        }
      />

      <section aria-labelledby="dash-post" className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 id="dash-post" className="mb-2 flex items-center gap-2 text-sm font-extrabold tracking-tight"><Send className="h-4 w-4 text-primary" aria-hidden /> To post</h2>
        <PostQueue compact />
      </section>

      <nav aria-label="Sections" className="mb-4 grid gap-3 md:grid-cols-3">
        {sections.map((x) => (
          <section key={x.title} className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-tight"><x.icon className="h-4 w-4 text-primary" aria-hidden /> {x.title}</h2>
            <div className="mt-3 grid flex-1 grid-cols-2 gap-2">
              {x.stats.map((t) => (
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

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="dash-away" className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 id="dash-away" className="mb-2 text-sm font-extrabold tracking-tight">Away today</h2>
          {away.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody is away. Everything runs as planned.</p>
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
          <button onClick={() => setView('absences')} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
            All absences <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </section>

        <section aria-labelledby="dash-todo" className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 id="dash-todo" className="mb-2 text-sm font-extrabold tracking-tight">Needs attention</h2>
          {todo.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing is missing.</p>
          ) : (
            <ul className="grid gap-1.5">
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

      <section aria-labelledby="dash-today" className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 id="dash-today" className="mb-2 text-sm font-extrabold tracking-tight">Today's sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing is scheduled today.</p>
        ) : (
          <ul className="divide-y divide-border">
            {sessions.map((x) => (
              <li key={x.key} className={`flex flex-col gap-x-3 gap-y-0.5 py-2 text-sm sm:flex-row sm:flex-wrap sm:items-center ${x.status.kind === 'canceled' ? 'opacity-60' : ''}`}>
                <span className="shrink-0 font-semibold tabular-nums sm:w-36">{fmtTime(x.time) || '-'}</span>
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
      </section>

      {/* the new designed calendar, as the public sees it, with month arrows and a download */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-extrabold tracking-tight">Calendar</h2>
          <CalendarSwitch tab={calTab} onChange={setCalTab} rooms />
        </div>
        <div key={calTab} className="aso-tab-in">
          {calTab === 'cluev' ? <MonthCalendarImage clubs events classes={false} /> : calTab === 'rooms' ? <MonthCalendarImage rooms /> : <MonthCalendarImage clubs={false} events={false} classes />}
        </div>
      </section>

    </div>
  )
}
