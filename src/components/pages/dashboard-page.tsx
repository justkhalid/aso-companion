'use client'

import * as React from 'react'
import { Send, AlertTriangle, Sparkles, UserX, ArrowRight, Ban, UserCheck, CalendarClock, Clock, Sun } from 'lucide-react'
import { useStore } from '@/lib/store'
import { DAY_KEYS } from '@/lib/constants'
import { PageHead, Chip } from '@/components/ui-bits'
import { fmtAbsenceRange, isoOf, nextOccurrence, termStatus, classStatusOn, clubStatusOn, clubWhere, eventStatusOn, eventWhere, isOnceEvent, fmtTime, parseSlot } from '@/lib/app-utils'
import { Button } from '@/components/ui/button'
import { openQuickAdd } from '@/components/admin/quick-add'
import { PostQueue } from '@/components/post-queue'
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
  const toPost = React.useMemo(() => postQueue(state).length, [state])

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

  /* the shortcuts, in two groups that each have a colour of their own */
  type Job = { label: string; hint: string; icon: React.ElementType; go: () => void; badge?: number }
  const posting: Job[] = [
    { label: 'To post', hint: 'What is waiting to go out', icon: Send, go: () => openSocial('todo'), badge: toPost },
    { label: 'Scheduled', hint: 'Posts set to go out later', icon: Clock, go: () => openSocial('scheduled') },
  ]
  const managing: Job[] = [
    { label: 'Clubs', hint: 'Edit clubs and their posters', icon: Sparkles, go: () => setView('intern-clubs') },
    { label: 'Events', hint: 'Add or edit an event', icon: CalendarClock, go: () => setView('intern-events') },
    { label: 'Report an absence', hint: 'Cancel or cover a session', icon: UserX, go: () => openQuickAdd('absence') },
  ]
  const group = (title: string, accent: string, tint: string, jobs: Job[]) => (
    <section aria-label={title} className={`rounded-2xl border border-border border-t-4 bg-card p-4 shadow-sm ${accent}`}>
      <h2 className="mb-3 text-sm font-extrabold tracking-tight">{title}</h2>
      <div className="grid gap-2">
        {jobs.map((j) => (
          <button key={j.label} onClick={j.go} className="relative flex items-center gap-3 rounded-xl bg-secondary/50 p-3 text-left transition hover:bg-secondary">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tint}`}><j.icon className="h-[18px] w-[18px]" aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-extrabold leading-tight tracking-tight">{j.label}</span>
              <span className="block text-xs font-medium text-muted-foreground">{j.hint}</span>
            </span>
            {!!j.badge && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-extrabold leading-none text-primary-foreground">{j.badge}</span>}
          </button>
        ))}
      </div>
    </section>
  )

  const week = st.mode === 's1' || st.mode === 's2' ? `Week ${st.week}` : st.mode === 'before' ? `Year starts in ${st.daysTo} days` : st.mode === 'break' ? 'Winter break' : 'Year complete'

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <PageHead
        title="Home"
        subtitle={`${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · ${week}`}
      />

      {/* 1. the calendar: clubs and events, classes or free rooms; as the designed month picture or as a week; each with its download */}
      <section aria-label="Calendar" className="mb-4 rounded-2xl border border-border border-t-4 border-t-primary bg-card p-4 shadow-sm">
        <UnifiedCalendar tab={calTab} onTab={setCalTab} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* 2. today: what is on, who is away, what needs her */}
        <section aria-label="Today" className="rounded-2xl border border-border border-t-4 border-t-emerald-500 bg-card p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold tracking-tight"><Sun className="h-4 w-4 text-emerald-600" aria-hidden /> Today</h2>

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

          <h3 className="mb-1.5 mt-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Needs you</h3>
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

        {/* 3. shortcuts, in two groups of their own colour */}
        <div className="grid content-start gap-4">
          {group('Posting', 'border-t-violet-500', 'bg-violet-500/10 text-violet-600 dark:text-violet-300', posting)}
          {group('Manage', 'border-t-amber-500', 'bg-amber-500/10 text-amber-600 dark:text-amber-300', managing)}
        </div>
      </div>
    </div>
  )
}
