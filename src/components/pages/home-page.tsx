'use client'

import * as React from 'react'
import {
  Plus,
  CalendarDays,
  BookOpen,
  Sparkles,
  Coffee,
  ArrowRight,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import {
  termStatus,
  weekMonday,
  fmtD,
  todayKey,
  toneClassForLevel,
  toneClassForClub,
  parseSlot,
  nextOccurrence,
  fmtEventWhen,
  greeting,
  isOnceEvent,
  parseISO,
} from '@/lib/app-utils'
import { DAY_FULL, DAY_KEYS, ROOM_LEGEND } from '@/lib/constants'
import { buildCalendarLinks } from '@/lib/export-word'
import { WeeklyGrid, CalendarListView, CalendarCardsView, CalViewSwitcher, readCalView, writeCalView, type GridItem, type LegendEntry, type CalendarView } from '@/components/weekly-grid'
import { ClassDialog } from '@/components/dialogs/class-dialog'
import { CalendarExportMenu } from '@/components/calendar-export'
import { SectionHeader, LinkButton, Chip, EmptyState } from '@/components/ui-bits'
import type { ClassEntry } from '@/lib/types'

export function HomePage({ admin }: { admin: boolean }) {
  const state = useStore((s) => s.state)
  const setView = useStore((s) => s.setView)

  const [classDialog, setClassDialog] = React.useState<{ open: boolean; cls: ClassEntry | null }>({
    open: false,
    cls: null,
  })

  /* calendar view (grid/list) shared by both home calendars, like clubs */
  const [calView, setCalView] = React.useState<CalendarView>(readCalView)
  React.useEffect(() => {
    writeCalView(calView)
  }, [calView])

  const st = termStatus(state)
  const now = new Date()
  const dateLine = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const named = admin

  // teachers calendar items
  const classItems: GridItem[] = (state.classes || []).map((c) => ({
    id: c.id,
    days: c.days || [],
    slot: c.time,
    code: c.level,
    meta: '',
    lead: c.teacher,
    room: c.room,
    tone: toneClassForLevel(state, c.level),
  }))
  const classLegend: LegendEntry[] = (() => {
    const used: string[] = []
    state.classes.forEach((c) => {
      if (c.level && !used.includes(c.level)) used.push(c.level)
    })
    return used.map((l) => ({ label: l, tone: toneClassForLevel(state, l) }))
  })()

  // week monday for the teachers calendar dates
  let wkMon: Date | null = null
  if (st.mode === 's1' || st.mode === 's2') wkMon = weekMonday(state, (st.week || 1) - 1)
  else if (st.mode === 'before') wkMon = st.s1
  else if (st.mode === 'break') wkMon = st.s2

  // clubs grid
  const clubItems: GridItem[] = (state.clubs || [])
    .filter((c) => (c.days || []).length && c.time)
    .map((c) => ({
      id: c.id,
      days: c.days,
      slot: c.time,
      code: c.name,
      meta: '',
      lead: c.lead || 'no lead yet',
      room: c.room,
      icon: c.icon,
      tone: toneClassForClub(state, c.id),
    }))
  const clubLegend: LegendEntry[] = (state.clubs || []).map((c) => ({
    label: c.name,
    tone: toneClassForClub(state, c.id),
  }))

  // events join the clubs grid: repeating on their weekday, one-off on the
  // weekday of their date, gold chips so they read as special
  const homeEventItems: GridItem[] = (state.events || [])
    .map((e) => {
      let day = ''
      if (!isOnceEvent(e)) day = e.day || ''
      else if (e.date) {
        const d = parseISO(e.date)
        day = DAY_KEYS[d.getDay() === 0 ? 6 : d.getDay() - 1] || ''
      }
      if (!day || !e.time) return null
      return {
        id: e.id,
        days: [day],
        slot: e.time,
        code: e.title,
        meta: '',
        lead: '',
        room: e.place || '',
        icon: e.icon || 'calendar',
        tone: 'tone-7',
      }
    })
    .filter(Boolean) as GridItem[]
  const homeClubItems = [...clubItems, ...homeEventItems]
  const homeClubLegend = [
    ...clubLegend,
    ...(homeEventItems.length ? [{ label: 'Special events', tone: 'tone-7' } as LegendEntry] : []),
  ]

  // today's schedule
  const tKey = todayKey()
  type TodayItem = { mins: number; title: string; sub: string; kind: 'class' | 'club' | 'event' }
  const todayItems: TodayItem[] = []
  ;(state.classes || []).forEach((c) => {
    if (!(c.days || []).includes(tKey)) return
    todayItems.push({
      mins: parseSlot(c.time).mins,
      title: `${c.code} · ${c.level}`,
      sub: [c.time, c.room, c.teacher].filter(Boolean).join(' · '),
      kind: 'class',
    })
  })
  ;(state.clubs || []).forEach((c) => {
    if (!(c.days || []).includes(tKey)) return
    todayItems.push({
      mins: parseSlot(c.time).mins,
      title: c.name,
      sub: [c.time, c.room, c.lead ? `lead: ${c.lead}` : ''].filter(Boolean).join(' · '),
      kind: 'club',
    })
  })
  ;(state.events || []).forEach((e) => {
    const isToday =
      e.recur === 'none'
        ? e.date && now.toDateString() === new Date(e.date).toDateString()
        : e.day === tKey
    if (!isToday) return
    todayItems.push({
      mins: parseSlot(e.time || '23:59').mins,
      title: e.title,
      sub: [e.time, e.place].filter(Boolean).join(' · ') || 'all day',
      kind: 'event',
    })
  })
  todayItems.sort((a, b) => a.mins - b.mins)

  // upcoming events (next 3)
  const upcoming = (state.events || [])
    .map((e) => ({ e, d: nextOccurrence(e) }))
    .filter((x) => x.d)
    .sort((a, b) => (a.d!.getTime() - b.d!.getTime()))
    .slice(0, 3)

  const gridRef = React.useRef<HTMLDivElement>(null)
  const clubGridRef = React.useRef<HTMLDivElement>(null)

  const exportYear = (state.settings.year || 'export').replace(/\//g, '-')
  const buildClassOpts = () => ({
    title: 'ELTASO - Weekly Program',
    subtitle: (state.settings.institute || '') + ' - ' + (state.settings.year || '') + ' - ' + (state.classes || []).length + ' classes',
    items: classItems,
    legend: classLegend,
    rooms: ROOM_LEGEND,
    libraryLinks: buildCalendarLinks(state),
    appUrl: window.location.origin,
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      {/* hero */}
      <div className="mb-5">
        <div className="text-sm text-muted-foreground">{dateLine}</div>
        <div className="text-2xl font-extrabold tracking-tight">
          {greeting()}
          {named ? `, ${String(state.settings.coordinator || '').split(' ')[0]}` : ''}
        </div>
      </div>

      {/* admin: term status card */}
      {admin && (
        <div className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
          {st.mode === 's1' || st.mode === 's2' ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold">
                  {(st.week! - 1) < (state.settings.s1Weeks || 15) ? 'Semester 1' : 'Semester 2'} · Week {st.week} of{' '}
                  {state.levels.reduce((m, l) => Math.max(m, l.weeks.length), 0)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {fmtD(weekMonday(state, (st.week || 1) - 1))} ·{' '}
                  {fmtD(new Date(weekMonday(state, (st.week || 1) - 1).getTime() + 6 * 86400000))}
                </div>
              </div>
            </div>
          ) : st.mode === 'break' ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--aso-gold-tint)] text-[var(--aso-gold)]">
                <Coffee className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold">Winter break</div>
                <div className="text-sm text-muted-foreground">
                  Semester 2 starts Monday {fmtD(st.s2, { day: 'numeric', month: 'long', year: 'numeric' })} · in {st.daysTo} days
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold">
                  {st.mode === 'before'
                    ? `The year starts Monday ${fmtD(st.s1, { day: 'numeric', month: 'long' })}`
                    : 'Year complete · well done!'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {st.mode === 'before'
                    ? `${st.daysTo} days to go · set term dates any time in Settings`
                    : 'Set the new term start dates in Settings when next year is planned'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* teachers calendar */}
      <SectionHeader
        title="Teachers calendar"
        right={
          <>
            {admin && (
              <LinkButton
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setClassDialog({ open: true, cls: null })}
              >
                Add class
              </LinkButton>
            )}
            <CalendarExportMenu
              buildOpts={buildClassOpts}
              baseName={'ELTASO_Weekly_Program_' + exportYear}
              variant="pill"
            />
            <CalViewSwitcher view={calView} onChange={setCalView} />
          </>
        }
      />
      <div ref={gridRef} className="rounded-2xl bg-card">
        {classItems.length ? (
          calView === 'grid' ? (
            <WeeklyGrid
              items={classItems}
              legend={classLegend}
              weekMonday={wkMon}
              onCellClick={admin ? (it) => setClassDialog({ open: true, cls: state.classes.find((c) => c.id === it.id) || null }) : undefined}
            />
          ) : calView === 'cards' ? (
            <CalendarCardsView
              items={classItems}
              legend={classLegend}
              onCellClick={admin ? (it) => setClassDialog({ open: true, cls: state.classes.find((c) => c.id === it.id) || null }) : undefined}
            />
          ) : (
            <CalendarListView
              items={classItems}
              legend={classLegend}
              onCellClick={admin ? (it) => setClassDialog({ open: true, cls: state.classes.find((c) => c.id === it.id) || null }) : undefined}
            />
          )
        ) : (
          <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="No classes yet" hint="The weekly timetable appears here once classes are added." />
        )}
      </div>

      {/* clubs & events */}
      <div className="mt-7">
        <SectionHeader
          title="Clubs & events"
          right={
            <>
              <LinkButton icon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => setView('clubs')}>
                Open calendar
              </LinkButton>
              <CalViewSwitcher view={calView} onChange={setCalView} />
            </>
          }
        />
        <div ref={clubGridRef} className="rounded-2xl bg-card">
          {homeClubItems.length ? (
            calView === 'grid' ? (
              <WeeklyGrid items={homeClubItems} legend={homeClubLegend} emptyMessage="No club sessions yet" />
            ) : calView === 'cards' ? (
              <CalendarCardsView items={homeClubItems} legend={homeClubLegend} emptyMessage="No club sessions yet" />
            ) : (
              <CalendarListView items={homeClubItems} legend={homeClubLegend} emptyMessage="No club sessions yet" />
            )
          ) : (
            <EmptyState icon={<Sparkles className="h-5 w-5" />} title="No club sessions yet" hint="Club sessions appear here as soon as they are scheduled." />
          )}
        </div>

        {upcoming.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {upcoming.map(({ e, d }) => (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--aso-gold-tint)] text-[var(--aso-gold)]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold" dir="auto">{e.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {fmtD(d!, { weekday: 'long', day: 'numeric', month: 'long' })}
                    {e.time ? ` · ${e.time}` : ''}
                    {e.place ? ` · ${e.place}` : ''}
                  </div>
                </div>
                <Chip tone="gold">{fmtEventWhen(e)}</Chip>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* today */}
      <div className="mt-7">
        <SectionHeader
          title={`Today · ${DAY_FULL[tKey] || tKey}`}
          right={
            <span className="text-xs font-semibold text-muted-foreground">
              {todayItems.length ? `${todayItems.length} on today` : 'all clear'}
            </span>
          }
        />
        {todayItems.length ? (
          <div className="flex flex-col gap-2">
            {todayItems.map((it, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    it.kind === 'class'
                      ? 'bg-primary/10 text-primary'
                      : it.kind === 'club'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-[var(--aso-gold-tint)] text-[var(--aso-gold)]'
                  }`}
                >
                  {it.kind === 'class' ? (
                    <BookOpen className="h-4 w-4" />
                  ) : it.kind === 'club' ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <CalendarDays className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold" dir="auto">{it.title}</div>
                  <div className="text-sm text-muted-foreground">{it.sub}</div>
                </div>
                <Chip tone={it.kind === 'event' ? 'gold' : it.kind === 'club' ? 'primary' : 'default'}>
                  {it.kind}
                </Chip>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Coffee className="h-5 w-5" />} title="Nothing on today" hint="No classes, clubs or events today." />
        )}
      </div>

      {/* admin: this week by group + quick library */}
      {admin && <AdminHomeExtra />}

      <ClassDialog open={classDialog.open} onOpenChange={(v) => setClassDialog((s) => ({ ...s, open: v }))} cls={classDialog.cls} />
    </div>
  )
}

/* helper kept for clarity; weekly events compare their day key to today's */
function AdminHomeExtra() {
  const state = useStore((s) => s.state)
  const openLevel = useStore((s) => s.openLevel)
  const setView = useStore((s) => s.setView)
  const st = termStatus(state)
  const inSession = st.mode === 's1' || st.mode === 's2'
  const wi = inSession ? (st.week || 1) - 1 : -1

  // group levels by band
  const bands: { band: string; levels: typeof state.levels }[] = []
  state.levels.forEach((l) => {
    const b = l.band || ''
    let grp = bands.find((g) => g.band === b)
    if (!grp) {
      grp = { band: b, levels: [] as typeof state.levels }
      bands.push(grp)
    }
    grp.levels.push(l)
  })

  return (
    <div className="mt-7">
      <SectionHeader title="This week by group" />
      {bands.map((g) => (
        <div key={g.band || 'other'} className="mb-3">
          {g.band && (
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {g.band}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.levels.map((l) => {
              const w = wi >= 0 && wi < l.weeks.length ? l.weeks[wi] : null
              const showWi = w ? wi : Math.min(l.weeks.length - 1, Math.max(0, wi))
              const sw = l.weeks[showWi]
              return (
                <button
                  key={l.key}
                  onClick={() => openLevel(l.key)}
                  className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 font-bold">{l.label}</div>
                    <Chip tone="primary">{l.cefr}</Chip>
                  </div>
                  {sw && (
                    <div className="text-xs font-semibold text-primary">
                      {w ? 'This week' : 'Next up'} · W{showWi + 1} · {sw.theme}
                    </div>
                  )}
                  <div className="line-clamp-3 text-sm text-muted-foreground">{l.desc || ''}</div>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <div className="mt-4">
        <SectionHeader
          title="Quick library"
          right={
            <LinkButton icon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => setView('library')}>
              See all
            </LinkButton>
          }
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {state.library.slice(0, 3).map((l) => (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm font-semibold hover:border-primary/40"
            >
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate">{l.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
