'use client'

import * as React from 'react'
import {
  Send, AlertTriangle, Sparkles, UserX, Ban, UserCheck, CalendarDays, Sun, GraduationCap,
  Camera, CheckCircle2, ChevronRight, MoreHorizontal, Copy, CalendarOff, Pencil, Users, BarChart3,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { DAY_KEYS } from '@/lib/constants'
import { Chip } from '@/components/ui-bits'
import { peopleOf, rolesOf, fmtAbsenceRange, isoOf, nextOccurrence, classStatusOn, clubStatusOn, clubWhere, eventStatusOn, eventWhere, isOnceEvent, fmtTime, parseSlot } from '@/lib/app-utils'
import { isClubOver, isClassOver } from '@/lib/archive'
import { closedHoliday } from '@/lib/holidays'
import { UnifiedCalendar } from '@/components/unified-calendar'
import type { CalTab } from '@/components/calendar-switch'
import { postQueue } from '@/lib/post-queue'
import type { View } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

/*
  The admin's landing page. It answers, in the order the questions get asked:

    1. Is the building even open today?      -> the closed banner
    2. What is happening, and what is next?  -> the timeline, with actions on each row
    3. What needs me?                        -> the ranked list
    4. What does the week look like?          -> the seven day bars
    5. Is anything quietly wrong?             -> housekeeping

  Not a grid of number cards: "8 clubs, 3 events" is not something you act on at nine in
  the morning, and the sidebar already goes to every list.
*/

type SessionKind = 'class' | 'club' | 'event'

type Session = {
  key: string
  kind: SessionKind
  id: string
  title: string
  sub: string
  person: string
  time: string
  room: string
  status: { kind: string; cover?: string }
  mins: number
  endMins: number
}

type Action = {
  id: string
  text: string
  detail: string
  icon: React.ElementType
  urgent: boolean
  go: () => void
}

const TIME_RANGE = /^\d{1,2}[:.]\d{2}-\d{1,2}[:.]\d{2}$/

/* "14:00-16:00" -> how long it lasts, so we can say "35 min left" */
function endOf(t: string, startMins: number): number {
  const m = String(t || '').replace(/\s/g, '').match(/^(\d{1,2})[:.](\d{2})-(\d{1,2})[:.](\d{2})$/)
  if (!m) return startMins + 60
  const end = +m[3] * 60 + +m[4]
  return end > startMins ? end : startMins + 60
}

export function DashboardPage() {
  const state = useStore((s) => s.state)
  const setView = useStore((s) => s.setView)
  const openSocial = useStore((s) => s.openSocial)
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const [calTab, setCalTab] = React.useState<CalTab>('cluev')
  const page = useStore((s) => s.homeTab)
  const setPage = (k: 'overview' | 'calendar') => useStore.setState({ homeTab: k })
  const [lib, setLib] = React.useState<{ available: boolean; connected: boolean; summary?: { total: number; thisMonth: number; thisYear?: number; cardsToPrint: number; noPhoto: number } } | null>(null)
  React.useEffect(() => {
    fetch('/api/members?summary=1', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then(setLib).catch(() => setLib(null))
  }, [])

  /* who is being looked at, and the three small dialogs */
  const [focus, setFocus] = React.useState<string | null>(null)
  const [moving, setMoving] = React.useState<Session | null>(null)
  const [moveTime, setMoveTime] = React.useState('')
  const [canceling, setCanceling] = React.useState<Session | null>(null)
  const [covering, setCovering] = React.useState<Session | null>(null)

  const queue = React.useMemo(() => postQueue(state), [state])
  const now = new Date()
  const today = isoOf(now)
  const dayKey = DAY_KEYS[(now.getDay() + 6) % 7]
  const clubs = state.clubs.filter((c) => !isClubOver(c))
  const classes = state.classes.filter((c) => !isClassOver(c))

  /* ---- is the space open today? ---- */
  const closedToday = closedHoliday(today)

  const away = (state.absences || []).filter((a) => !a.moved && a.from <= today && a.to >= today)
  const awayName = (a: (typeof away)[number]) =>
    a.kind === 'club' ? state.clubs.find((c) => c.id === a.clubId)?.name || 'Club' : a.kind === 'event' ? state.events.find((e) => e.id === a.eventId)?.title || 'Event' : a.teacher

  /* ---- today, in time order ---- */
  const sessions: Session[] = [
    ...classes.filter((c) => (c.days || []).includes(dayKey)).map((c) => {
      const mins = parseSlot(c.time || '').mins
      return { key: c.id, kind: 'class' as const, id: c.id, title: c.code, sub: c.level, person: c.teacher || '', time: c.time, room: c.room, status: classStatusOn(state, c, today), mins, endMins: endOf(c.time, mins) }
    }),
    ...clubs.filter((c) => (c.days || []).includes(dayKey)).map((c) => {
      const where = clubWhere(state, c, today)
      const mins = parseSlot(where.time || '').mins
      return { key: c.id, kind: 'club' as const, id: c.id, title: c.name, sub: 'Club', person: c.lead || '', time: where.time, room: where.place, status: clubStatusOn(state, c.id, today), mins, endMins: endOf(where.time, mins) }
    }),
    ...state.events.filter((e) => (isOnceEvent(e) ? e.date === today : e.day === dayKey && !!nextOccurrence(e) && isoOf(nextOccurrence(e)!) === today)).map((e) => {
      const where = eventWhere(state, e, today)
      const mins = parseSlot(where.time || '').mins
      return { key: e.id, kind: 'event' as const, id: e.id, title: e.title, sub: 'Event', person: e.lead || '', time: where.time, room: where.place, status: eventStatusOn(state, e.id, today), mins, endMins: endOf(where.time, mins) }
    }),
  ].sort((a, b) => a.mins - b.mins)

  const nowMins = now.getHours() * 60 + now.getMinutes()
  const nextIdx = sessions.findIndex((s) => s.mins >= nowMins && s.status.kind !== 'canceled')
  const running = sessions.find((s) => s.mins <= nowMins && s.endMins > nowMins && s.status.kind !== 'canceled')
  const remaining = sessions.filter((s) => s.mins >= nowMins && s.status.kind !== 'canceled').length
  const shown = focus ? sessions.filter((s) => s.person === focus) : sessions

  /* ---- everyone with something today ---- */
  const onToday = Array.from(new Set(sessions.map((s) => s.person).filter(Boolean)))

  /* ---- what needs her, urgent first ---- */
  const uncovered = away.filter((a) => !a.cover).length
  const noTeacher = classes.filter((c) => !c.teacher).length
  const noRoom = classes.filter((c) => !c.room).length
  const noLead = clubs.filter((c) => !c.lead).length
  const noPoster = clubs.filter((c) => !c.poster && !c.placeholder).length

  const postDetail = (q: (typeof queue)[number]) =>
    `${q.daysAway === 0 ? 'today' : q.daysAway === 1 ? 'tomorrow' : q.when.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · post it ${q.daysAway <= 1 ? 'now' : 'soon'}`

  const actions: Action[] = []
  queue.slice(0, 2).forEach((q) => actions.push({
    id: `post-${q.kind}-${q.id}`,
    text: q.name,
    detail: postDetail(q),
    icon: Send,
    urgent: q.daysAway <= 1,
    go: () => openSocial(q.kind, { kind: q.kind, id: q.id }),
  }))
  if (queue.length > 2) actions.push({ id: 'posts-more', text: `${queue.length - 2} more to publish`, detail: 'Everything else that needs a post', icon: Send, urgent: false, go: () => openSocial('todo') })
  if (uncovered) actions.push({ id: 'cover', text: `${uncovered} ${uncovered === 1 ? 'session is' : 'sessions are'} canceled today with no cover`, detail: 'Open the day to find someone free', icon: UserX, urgent: true, go: () => { const s = sessions.find((x) => x.status.kind === 'canceled'); if (s) setCovering(s) } })
  if (noTeacher) actions.push({ id: 'teachers', text: `${noTeacher} ${noTeacher === 1 ? 'class has' : 'classes have'} no teacher`, detail: 'Set one in Classes', icon: GraduationCap, urgent: false, go: () => setView('classes') })
  if (noRoom) actions.push({ id: 'rooms', text: `${noRoom} ${noRoom === 1 ? 'class has' : 'classes have'} no room`, detail: 'Set one in Classes', icon: GraduationCap, urgent: false, go: () => setView('classes') })
  if (noLead) actions.push({ id: 'leads', text: `${noLead} ${noLead === 1 ? 'club has' : 'clubs have'} no lead`, detail: 'Set one in Clubs', icon: Sparkles, urgent: false, go: () => setView('intern-clubs') })
  if (noPoster) actions.push({ id: 'posters', text: `${noPoster} ${noPoster === 1 ? 'club has' : 'clubs have'} no poster`, detail: 'The story falls back to a plain card', icon: Camera, urgent: false, go: () => setView('intern-clubs') })

  /* ---- ASO in numbers ---- */
  const people = peopleOf(state)
  const withRole = (re: RegExp) => people.filter((m) => rolesOf(m).some((r) => re.test(r))).length
  const eventsComing = state.events.filter((e) => nextOccurrence(e)).length
  const weeklySessions = classes.reduce((n, c) => n + (c.days || []).length, 0) + clubs.reduce((n, c) => n + (c.days || []).length, 0)
  const roomsUsed = new Set([...classes.map((c) => c.room), ...clubs.map((c) => c.room), ...state.events.map((e) => e.place)].map((r) => (r || '').trim()).filter(Boolean)).size
  const monthKey = today.slice(0, 7)
  const allPosts = [...state.clubs, ...state.events].flatMap((x) => x.kit?.posts || [])
  const memberTotal = lib?.connected && lib.summary ? lib.summary.total : null
  const hero: { value: string; label: string; sub: string; view?: View }[] = [
    { value: memberTotal === null ? '-' : String(memberTotal), label: 'Members', sub: memberTotal === null ? 'Open on the director\'s computer' : `${lib!.summary!.thisMonth} joined this month${lib!.summary!.thisYear !== undefined ? `, ${lib!.summary!.thisYear} this year` : ''}`, view: 'members' },
    { value: String(people.length), label: 'On the team', sub: 'teachers, volunteers, interns and staff', view: 'team' },
    { value: String(weeklySessions), label: 'Sessions a week', sub: 'classes and clubs, every week' },
    { value: String(roomsUsed), label: roomsUsed === 1 ? 'Space in use' : 'Spaces in use', sub: 'rooms and places with something booked' },
  ]
  const roleBars = [
    { label: 'Teachers', n: withRole(/teacher/i) },
    { label: 'Volunteers', n: withRole(/volunteer/i) },
    { label: 'Interns', n: withRole(/intern/i) },
    { label: 'Coordinators and staff', n: withRole(/coordinator|administrator|director|manager/i) },
  ]
  const perDay = DAY_KEYS.map((k) => classes.filter((c) => (c.days || []).includes(k)).length + clubs.filter((c) => (c.days || []).includes(k)).length)
  const perDayMax = Math.max(1, ...perDay)
  const band = (b: string) => classes.filter((c) => (c.level || '').split('·')[0].trim().toLowerCase() === b).length
  const classRows = [
    { label: 'All classes', n: classes.length },
    { label: 'Kids', n: band('kids') },
    { label: 'Teens', n: band('teens') },
    { label: 'Adults', n: band('adults') },
  ]
  const clubEventRows = [
    { label: 'Clubs', n: clubs.length },
    { label: 'Events', n: state.events.length },
    { label: 'Events coming up', n: eventsComing },
    { label: 'Posts this month', n: allPosts.filter((p) => p.t.startsWith(monthKey)).length },
  ]

  const pulse = [
    closedToday ? `Closed for ${closedToday.name}` : sessions.length === 0 ? 'Nothing scheduled today' : `${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'} today`,
    !closedToday && remaining > 0 && sessions.length !== remaining ? `${remaining} still to come` : '',
    away.length ? `${away.length} away` : '',
    queue.length ? `${queue.length} to post` : '',
  ].filter(Boolean).join(' · ')

  /* ---- actions ---- */
  const copyToday = () => {
    const lines = sessions.map((s) => `${fmtTime(s.time) || '—'}  ${s.title}${s.room ? ` · ${s.room}` : ''}${s.status.kind === 'canceled' ? '  (canceled)' : ''}`)
    const text = [
      now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
      closedToday ? `Closed for ${closedToday.name}` : '',
      ...lines,
      away.length ? `Away: ${away.map(awayName).join(', ')}` : '',
    ].filter(Boolean).join('\n')
    void navigator.clipboard.writeText(text).then(() => toast('Today copied')).catch(() => toast('Could not copy', false))
  }

  const saveMove = () => {
    if (!moving) return
    const t = moveTime.replace(/\s/g, '')
    if (!TIME_RANGE.test(t)) { toast('Use a range like 14:00-16:00', false); return }
    patch((d) => {
      const list = (moving.kind === 'class' ? d.classes : moving.kind === 'club' ? d.clubs : d.events) as { id: string; time?: string }[]
      const item = list.find((x) => x.id === moving.id)
      if (item) item.time = t
    })
    toast(`Moved to ${t}`)
    setMoving(null)
  }

  const doCancel = () => {
    if (!canceling) return
    const s = canceling
    patch((d) => {
      const list = d.absences || (d.absences = [])
      list.push({
        id: `abs-${Date.now()}`,
        kind: s.kind === 'class' ? 'teacher' : s.kind,
        teacher: s.person || '',
        ...(s.kind === 'class' ? { classId: s.id } : s.kind === 'club' ? { clubId: s.id } : { eventId: s.id }),
        from: today,
        to: today,
        reason: 'Canceled from Home',
      })
    })
    toast(`${s.title} is canceled for today`)
    setCanceling(null)
  }

  /* a club or an event can have a story; a class cannot, so the narrowing lives here */
  const postStory = (s: Session) => { if (s.kind !== 'class') openSocial(s.kind, { kind: s.kind, id: s.id }) }

  const freeFor = (s: Session) => state.team    .filter((p) => p.name !== s.person && !away.some((a) => a.teacher === p.name))
    .filter((p) => !sessions.some((o) => o.person === p.name && o.mins < s.endMins && o.endMins > s.mins))
    .slice(0, 8)

  const doCover = (name: string) => {
    if (!covering) return
    const s = covering
    patch((d) => {
      const a = (d.absences || []).find((x) => x.from <= today && x.to >= today &&
        ((s.kind === 'class' && x.classId === s.id) || (s.kind === 'club' && x.clubId === s.id) || (s.kind === 'event' && x.eventId === s.id)))
      if (a) a.cover = name
    })
    toast(`${name} covers ${s.title}`)
    setCovering(null)
  }

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
      </header>

      {page === 'calendar' ? (
        <section aria-label="Calendar" className="rounded-2xl border border-border bg-card p-4">
          <UnifiedCalendar tab={calTab} onTab={setCalTab} />
        </section>
      ) : (
        <>
          {closedToday && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--aso-gold)]/40 bg-[var(--aso-gold-tint)] px-4 py-3">
              <CalendarOff className="h-5 w-5 shrink-0 text-[var(--aso-gold)]" aria-hidden />
              <p className="min-w-0 flex-1 text-sm font-bold text-foreground">
                Closed today for {closedToday.name}.
                <span className="ml-1 font-medium text-muted-foreground">Nothing is expected to run.</span>
              </p>
              <button type="button" onClick={() => setPage('calendar')} className="text-xs font-bold text-primary hover:underline">See the calendar</button>
            </div>
          )}

          {/* ---- 5. ASO in numbers ---- */}
          <section aria-label="ASO in numbers" className="mb-4 rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold tracking-tight"><BarChart3 className="h-4 w-4 text-primary" aria-hidden /> ASO in numbers</h2>

            <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4 lg:divide-x lg:divide-border">
              {hero.map((t, i) => {
                const Comp: React.ElementType = t.view ? 'button' : 'div'
                return (
                  <Comp
                    key={t.label}
                    {...(t.view ? { type: 'button', onClick: () => setView(t.view!) } : null)}
                    className={cn('group flex min-w-0 flex-col items-start justify-start text-left outline-none', i > 0 && 'lg:pl-6', t.view && 'focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-ring')}
                  >
                    <span className="block text-4xl font-extrabold leading-none tracking-tight tabular-nums text-primary">{t.value}</span>
                    <span className="mt-2 block text-[13px] font-bold group-hover:underline">{t.label}</span>
                    <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-muted-foreground">{t.sub}</span>
                  </Comp>
                )
              })}
            </div>

            <div className="mt-6 grid gap-3 border-t border-border pt-5 md:grid-cols-3">
              {([
                { title: 'People', rows: roleBars, foot: 'One person can hold several roles.' },
                { title: 'Classes', rows: classRows, foot: `${state.levels.length} levels, by age group` },
                { title: 'Clubs and events', rows: clubEventRows, foot: `${allPosts.length} posts sent from this app` },
              ]).map((panel) => (
                <div key={panel.title} className="flex flex-col rounded-xl border border-border bg-background/60 p-4">
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{panel.title}</h3>
                  <ul className="divide-y divide-border">
                    {panel.rows.map((r) => (
                      <li key={r.label} className="flex h-9 items-center justify-between text-[13px]">
                        <span className="font-semibold">{r.label}</span>
                        <span className="text-lg font-extrabold tabular-nums">{r.n}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-auto pt-3 text-[11.5px] text-muted-foreground">{panel.foot}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ---- the day in four numbers ---- */}
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {([
              { label: 'Today', value: closedToday ? 'Closed' : String(sessions.length), sub: closedToday ? closedToday.name : remaining > 0 ? `${remaining} still to come` : sessions.length ? 'All done' : 'Nothing scheduled', go: undefined as undefined | (() => void) },
              { label: running ? 'Running now' : 'Up next', value: (running || sessions[nextIdx])?.title || 'Nothing', sub: (running || sessions[nextIdx]) ? [fmtTime((running || sessions[nextIdx])!.time), (running || sessions[nextIdx])!.room].filter(Boolean).join(' · ') : 'The day is clear', go: undefined },
              { label: 'To post', value: String(queue.length), sub: queue.length ? 'Clubs and events without a fresh post' : 'Everything is posted', go: () => openSocial('todo') },
              { label: 'Away today', value: String(away.length), sub: away.length ? (uncovered ? `${uncovered} without cover` : 'All covered') : 'Nobody is away', go: () => setView('absences') },
            ]).map((t) => {
              const Comp: React.ElementType = t.go ? 'button' : 'div'
              return (
                <Comp
                  key={t.label}
                  {...(t.go ? { type: 'button', onClick: t.go } : null)}
                  className={cn('min-w-0 rounded-2xl border border-border bg-card px-4 py-3 text-left outline-none', t.go && 'transition hover:border-primary/40 hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring')}
                >
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t.label}</span>
                  <span className="mt-0.5 block truncate text-xl font-extrabold leading-tight tracking-tight tabular-nums" dir="auto">{t.value}</span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{t.sub}</span>
                </Comp>
              )
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start">
            {/* ---- 1. the day ---- */}
            <section className={cn('rounded-2xl border border-border bg-card p-5', closedToday && 'opacity-70')}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-tight"><Sun className="h-4 w-4 text-primary" aria-hidden /> Today</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                    {sessions.length === 0 ? 'empty' : `${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'}`}
                  </span>
                  {sessions.length > 0 && (
                    <button type="button" onClick={copyToday} title="Copy today's schedule as text" className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-bold text-muted-foreground outline-none transition hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring">
                      <Copy className="h-3 w-3" aria-hidden /> Copy
                    </button>
                  )}
                </div>
              </div>

              {running && (
                <p className="mb-3 flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-[12.5px] font-bold text-primary">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden />
                  {running.title} is on now — {running.endMins - nowMins} min left
                </p>
              )}

              {onToday.length > 1 && (
                <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by person">
                  {onToday.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFocus(focus === p ? null : p)}
                      aria-pressed={focus === p}
                      className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-ring', focus === p ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-card text-muted-foreground hover:bg-secondary')}
                    >
                      <Users className="h-3 w-3" aria-hidden /> {p}
                    </button>
                  ))}
                </div>
              )}

              {sessions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Nothing is scheduled for today.
                </p>
              ) : shown.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {focus} has nothing today. <button type="button" onClick={() => setFocus(null)} className="font-bold text-primary hover:underline">Show everyone</button>
                </p>
              ) : (
                <ol>
                  {shown.map((s) => {
                    const past = s.mins < nowMins
                    const isNext = s.key === sessions[nextIdx]?.key
                    return (
                      <li key={s.key} className={cn('group flex gap-3', past && !isNext && 'opacity-55')}>
                        <span className="w-[4.25rem] shrink-0 whitespace-nowrap pt-0.5 text-right text-[11px] font-bold leading-tight tabular-nums text-muted-foreground">
                          {(fmtTime(s.time) || '—').split(' - ')[0]}
                          {(fmtTime(s.time) || '').includes(' - ') && <span className="block text-[10px] font-semibold opacity-70">to {(fmtTime(s.time) || '').split(' - ')[1]}</span>}
                        </span>
                        <span className="relative flex w-3 shrink-0 justify-center pt-1.5">
                          <span className={cn('z-10 h-2.5 w-2.5 rounded-full ring-2 ring-card', isNext ? 'bg-primary' : past ? 'bg-border' : 'bg-foreground/25')} />
                          {s.key !== shown[shown.length - 1].key && <span className="absolute top-3.5 h-full w-px bg-border" aria-hidden />}
                        </span>
                        <span className="min-w-0 flex-1 pb-3">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className={cn('text-[13.5px] font-bold leading-tight', s.status.kind === 'canceled' && 'line-through decoration-2')}>{s.title}</span>
                            {isNext && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-primary-foreground">Next</span>}
                            {s.status.kind === 'canceled' && <Chip tone="gold" icon={Ban}>Canceled</Chip>}
                            {s.status.kind === 'cover' && <Chip tone="primary" icon={UserCheck}>Cover: {s.status.cover}</Chip>}
                            <span className="ml-auto flex items-center gap-1">
                              {s.status.kind === 'canceled' && (
                                <button type="button" onClick={() => setCovering(s)} className="rounded-full border border-border px-2 py-0.5 text-[10.5px] font-bold text-primary opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100">Find cover</button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button type="button" aria-label={`Actions for ${s.title}`} className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground opacity-0 transition hover:bg-secondary group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100">
                                    <MoreHorizontal className="h-4 w-4" aria-hidden />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  <DropdownMenuItem onSelect={() => setView(s.kind === 'class' ? 'classes' : s.kind === 'club' ? 'intern-clubs' : 'intern-events')}>
                                    <Pencil className="h-4 w-4" aria-hidden /> Open in {s.kind === 'class' ? 'Classes' : s.kind === 'club' ? 'Clubs' : 'Events'}
                                  </DropdownMenuItem>
                                  {s.kind !== 'class' && (
                                    <DropdownMenuItem onSelect={() => postStory(s)}>
                                      <Send className="h-4 w-4" aria-hidden /> Post the story
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onSelect={() => { setMoving(s); setMoveTime(s.time) }}>
                                    <CalendarDays className="h-4 w-4" aria-hidden /> Move to another time…
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => setCanceling(s)} className="text-destructive">
                                    <Ban className="h-4 w-4" aria-hidden /> Cancel for today…
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </span>
                          </span>
                          <span className="mt-0.5 flex flex-wrap gap-x-1.5 text-[11.5px] text-muted-foreground">
                            <span>{s.sub}</span>
                            {s.person && <><span aria-hidden>·</span><span>{s.person}</span></>}
                            {s.room && <><span aria-hidden>·</span><span>{s.room}</span></>}
                          </span>
                        </span>
                      </li>
                    )
                  })}
                </ol>
              )}

              {sessions.length > 0 && nextIdx === -1 && !running && (
                <p className="mt-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--aso-ok)]" aria-hidden /> That is everything for today.
                </p>
              )}

              {away.length > 0 && (
                <div className="mt-4 border-t border-border pt-4">
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

            <div className="flex flex-col gap-4">
              {/* ---- 2. what needs her ---- */}
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
                            <span className="block truncate text-[13px] font-bold leading-tight">{a.text}</span>
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
          </div>

          <section aria-label="Sessions by weekday" className="mt-4 rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold normal-case tracking-tight text-foreground">Sessions by weekday</h3>
            <div className="flex h-36 items-end gap-1.5" role="img" aria-label={`Sessions per weekday: ${DAY_KEYS.map((k, i) => `${k} ${perDay[i]}`).join(', ')}`}>
              {perDay.map((n, i) => (
                <div key={DAY_KEYS[i]} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <span className={cn('text-[12px] font-extrabold tabular-nums', n === 0 && 'text-muted-foreground/50')}>{n}</span>
                  <span className={cn('w-full rounded-t-md', n === perDayMax && n > 0 ? 'bg-primary' : 'bg-primary/30')} style={{ height: `${n === 0 ? 3 : Math.max(8, (n / perDayMax) * 84)}px` }} />
                  <span className="text-[10.5px] font-bold uppercase text-muted-foreground">{DAY_KEYS[i]}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11.5px] text-muted-foreground">Busiest: {DAY_KEYS.filter((_, i) => perDay[i] === perDayMax && perDayMax > 0).join(' and ') || 'none'}</p>
          </section>
        </>
      )}

      {/* ---- move to another time ---- */}
      <Dialog open={!!moving} onOpenChange={(v) => !v && setMoving(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Move {moving?.title}</DialogTitle>
            <DialogDescription>Only today changes — the weekly pattern stays as it is.</DialogDescription>
          </DialogHeader>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            New time
            <input
              value={moveTime}
              onChange={(e) => setMoveTime(e.target.value)}
              placeholder="14:00-16:00"
              inputMode="numeric"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary"
            />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoving(null)}>Cancel</Button>
            <Button onClick={saveMove}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- cancel for today ---- */}
      <AlertDialog open={!!canceling} onOpenChange={(v) => !v && setCanceling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {canceling?.title} for today?</AlertDialogTitle>
            <AlertDialogDescription>
              It will show as canceled today and stay in the weekly pattern. You can undo it in Absences.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={doCancel}>Cancel it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---- who is free at that hour ---- */}
      <Dialog open={!!covering} onOpenChange={(v) => !v && setCovering(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Who can cover {covering?.title}?</DialogTitle>
            <DialogDescription>
              People who are not away and not busy {fmtTime(covering?.time || '') || 'then'}.
            </DialogDescription>
          </DialogHeader>
          {covering && freeFor(covering).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody is free at that hour.</p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {covering && freeFor(covering).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => doCover(p.name)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left outline-none transition hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-extrabold">
                      {p.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold">{p.name}</span>
                      <span className="block text-[11px] text-muted-foreground">{(p.roles?.length ? p.roles : [p.role]).filter(Boolean).join(' · ') || 'No role set'}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
