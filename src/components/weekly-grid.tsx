'use client'

import * as React from 'react'
import { CalendarRange, LayoutGrid, List } from 'lucide-react'
import { DAY_KEYS } from '@/lib/constants'
import { addDays, fmtD, todayKey } from '@/lib/app-utils'
import { clubIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

export interface GridItem {
  id: string
  days: string[]
  slot: string
  code: string
  meta?: string
  tone: string
  lead?: string
  room?: string
  icon?: string // CLUB_ICONS key; renders on the chip instead of a dot
}

export interface LegendEntry {
  label: string
  tone: string
}

/* internal: one parsed placement on the grid */
export interface ParsedChip {
  item: GridItem
  startMin: number
  endMin: number
  label: string
}

export interface ChipPlacement {
  ev: ParsedChip
  lane: number
  /** minutes from the day's start hour where the chip begins */
  leftMin: number
  /** chip width in minutes */
  widthMin: number
}

/**
 * Layout one day's events: simultaneous and overlapping events STACK into
 * separate lanes, each chip using the full width of its time span.
 * (Side-by-side splitting is a wall-poster-only treatment.)
 * Returns every chip with its lane, left offset (minutes) and width (minutes).
 */
export function packDayChips(sorted: ParsedChip[]): ChipPlacement[] {
  const layerEnds: number[] = []
  const out: ChipPlacement[] = []
  for (const ev of sorted) {
    let li = layerEnds.findIndex((end) => end <= ev.startMin)
    if (li < 0) {
      li = layerEnds.length
      layerEnds.push(0)
    }
    layerEnds[li] = ev.endMin
    out.push({ ev, lane: li, leftMin: 0, widthMin: ev.endMin - ev.startMin })
  }
  return out
}

/** lanes used by a day (for row sizing) */
export function lanesOf(placements: ChipPlacement[]): number {
  return Math.max(1, ...placements.map((p) => p.lane + 1))
}

export function parseChip(item: GridItem): ParsedChip | null {
  const r = parseRange(item.slot)
  if (!r) return null
  return { item, startMin: r.startMin, endMin: r.endMin, label: r.label }
}

interface Props {
  items: GridItem[]
  legend?: LegendEntry[]
  weekMonday?: Date | null
  onCellClick?: (item: GridItem) => void
  emptyMessage?: string
  emptyHint?: string
}

const START_HOUR = 9
const END_HOUR = 18
const HOUR_WIDTH = 90
const DAY_LABEL_W = 72

/* v4.7 compact chip metrics: chips are content-height (no dead space).
   v4.11: simultaneous events always STACK (side-by-side is a wall-poster-only
   treatment - it reads confusingly on the timed grid). */
const CHIP_H = 52
const CHIP_GAP = 4
const ROW_PAD = 6
const ROW_H_EMPTY = 44 // empty days keep a slim half-height row

function parseRange(t: string): { startMin: number; endMin: number; label: string } | null {
  const s = String(t || '').replace(/\s/g, '')
  const m = s.match(/^(\d{1,2})[:.](\d{2})-(\d{1,2})[:.](\d{2})$/)
  if (!m) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    startMin: +m[1] * 60 + +m[2],
    endMin: +m[3] * 60 + +m[4],
    label: `${pad(+m[1])}:${pad(+m[2])}-${pad(+m[3])}:${pad(+m[4])}`,
  }
}

export function chipLabel(t: string): string {
  const r = parseRange(t)
  return r ? r.label : String(t || '')
}

export function WeeklyGrid({
  items,
  legend,
  weekMonday,
  onCellClick,
  emptyMessage = 'Nothing scheduled yet',
  emptyHint = 'Sessions appear here as soon as they are added.',
}: Props) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const tKey = todayKey()
  const tday = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  const hours: number[] = []
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h)

  const parsed: ParsedChip[] = []
  for (const it of items) {
    const c = parseChip(it)
    if (c) parsed.push(c)
  }

  if (!parsed.length) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <div className="font-semibold text-foreground">{emptyMessage}</div>
        <div className="mt-1 text-sm text-muted-foreground">{emptyHint}</div>
      </div>
    )
  }

  // Group by day
  const byDay: Record<string, ParsedChip[]> = {}
  for (const p of parsed) {
    for (const d of p.item.days) {
      ;(byDay[d] ||= []).push(p)
    }
  }

  const gridWidth = DAY_LABEL_W + hours.length * HOUR_WIDTH

  return (
    <div className="rounded-2xl border border-border bg-card p-2 sm:p-3">
      <div className="overflow-x-auto scroll-thin">
        <div style={{ width: gridWidth, position: 'relative' }}>
          {/* Hour header row: each label sits ON the vertical line that marks
              the START of that hour (not centered inside the hour cell) */}
          <div className="sticky top-0 z-20 border-b border-border bg-card" style={{ height: 40, position: 'relative' }}>
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute top-0 flex h-full items-center text-[11px] font-bold tabular-nums text-muted-foreground"
                style={{ left: DAY_LABEL_W + i * HOUR_WIDTH, transform: 'translateX(-50%)' }}
              >
                {pad(h)}:00
              </div>
            ))}
          </div>

          {/* Day rows: days down the left */}
          {DAY_KEYS.map((d, di) => {
            const evs = (byDay[d] || []).slice().sort((a, b) => a.startMin - b.startMin)
            const isEmpty = evs.length === 0
            const isToday = di === tday
            const dd = weekMonday ? addDays(weekMonday, di) : null

            // Side-by-side clusters + stacked lanes (see packDayChips)
            const placements = isEmpty ? [] : packDayChips(evs)
            const laneCount = lanesOf(placements)
            const rowH = isEmpty
              ? ROW_H_EMPTY
              : ROW_PAD * 2 + laneCount * CHIP_H + (laneCount - 1) * CHIP_GAP

            return (
              <div key={d} className="flex border-b border-border/60" style={{ height: rowH, position: 'relative' }}>
                {/* Day label */}
                <div
                  className={`flex flex-col items-center justify-center shrink-0 border-r border-border ${
                    isToday ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  style={{ width: DAY_LABEL_W }}
                >
                  <div className="text-[11px] font-bold uppercase tracking-wide">{d}</div>
                  {dd && <div className="text-[12px] font-semibold text-foreground">{fmtD(dd, { day: 'numeric' })}</div>}
                </div>

                {/* Hour columns */}
                <div className={`relative flex-1 ${isToday ? 'bg-primary/[0.03]' : ''}`}>
                  {/* Vertical hour grid lines */}
                  {hours.map((_, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-l border-border/40" style={{ left: i * HOUR_WIDTH }} />
                  ))}

                  {/* Event chips, positioned by their real start and end time.
                      Simultaneous events sit side by side; staggered overlaps
                      stack into lanes. */}
                  {placements.map((p) => {
                    const e = p.ev
                    const startOffset = e.startMin - START_HOUR * 60 + p.leftMin
                    const duration = p.widthMin
                    const leftPx = (startOffset / 60) * HOUR_WIDTH
                    const widthPx = (duration / 60) * HOUR_WIDTH

                    const chipLeft = leftPx + 2
                    const chipWidth = widthPx - 4
                    const chipTop = ROW_PAD + p.lane * (CHIP_H + CHIP_GAP)

                    const Icon = clubIcon(e.item.icon)?.Icon
                    const Comp: React.ElementType = onCellClick ? 'button' : 'div'
                    return (
                      <div
                        key={e.item.id + p.lane + p.leftMin}
                        className="absolute"
                        style={{ left: chipLeft, width: chipWidth, top: chipTop, height: CHIP_H, zIndex: 10 + p.lane }}
                      >
                        <Comp
                          onClick={onCellClick ? () => onCellClick(e.item) : undefined}
                          className={`relative flex h-full w-full flex-col justify-center gap-[3px] overflow-hidden rounded-lg border px-2 py-1 pl-[13px] text-left transition ${e.item.tone} ${
                            onCellClick ? 'hover:brightness-[1.04] hover:shadow-md' : ''
                          }`}
                          style={{
                            background: 'var(--tone-bg)',
                            borderColor: 'var(--tone-line)',
                            color: 'var(--tone-txt)',
                          }}
                        >
                          {/* slim accent bar on the left edge */}
                          <span
                            aria-hidden
                            className="absolute left-[3px] top-1 bottom-1 w-[3px] rounded-full"
                            style={{ background: 'var(--tone-txt)', opacity: 0.45 }}
                          />
                          <span
                            className="flex w-full items-center gap-1 text-[11px] font-bold leading-[13px]"
                            style={{ color: 'var(--tone-txt)' }}
                          >
                            {Icon ? (
                              <Icon className="h-3 w-3 shrink-0" />
                            ) : (
                              <i className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--tone-txt)' }} />
                            )}
                            <span className="truncate">{e.item.code}</span>
                          </span>
                          <span
                            className="truncate text-[10px] font-semibold leading-[12px] tabular-nums"
                            style={{ color: 'var(--tone-txt)', opacity: 0.92 }}
                          >
                            {e.label}
                            {e.item.room ? ` · ${e.item.room}` : ''}
                          </span>
                          {e.item.lead && (
                            <span
                              className="truncate text-[10px] font-medium leading-[12px]"
                              style={{ color: 'var(--tone-txt)', opacity: 0.75 }}
                            >
                              {e.item.lead}
                            </span>
                          )}
                        </Comp>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {legend && legend.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 px-1">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
              <i className={`${l.tone} inline-block h-2 w-2 rounded-full`} style={{ background: 'var(--tone-txt)' }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------
   Calendar view switcher: the same pill used on every page that shows a
   calendar (home, clubs). One shared component + one shared localStorage
   key so the preference follows the user around. Grid stays the default.
   ------------------------------------------------------------------------- */
export type CalendarView = 'grid' | 'cards' | 'list'
export const CAL_VIEW_KEY = 'aso-cal-view'

export function readCalView(): CalendarView {
  if (typeof window === 'undefined') return 'grid'
  try {
    const v = window.localStorage.getItem(CAL_VIEW_KEY)
    return v === 'list' ? 'list' : v === 'cards' ? 'cards' : 'grid'
  } catch {
    return 'grid'
  }
}

export function writeCalView(v: CalendarView): void {
  try { window.localStorage.setItem(CAL_VIEW_KEY, v) } catch { /* private mode */ }
}

export function CalViewSwitcher({
  view,
  onChange,
  className,
}: {
  view: CalendarView
  onChange: (v: CalendarView) => void
  className?: string
}) {
  return (
    <div
      className={cn('flex items-center gap-0.5 rounded-full border border-border bg-secondary/70 p-0.5', className)}
      role="group"
      aria-label="Calendar view"
    >
      <ViewModeButton active={view === 'grid'} onClick={() => onChange('grid')} label="Grid view">
        <LayoutGrid className="h-3.5 w-3.5" />
      </ViewModeButton>
      <ViewModeButton active={view === 'cards'} onClick={() => onChange('cards')} label="Week cards view">
        <CalendarRange className="h-3.5 w-3.5" />
      </ViewModeButton>
      <ViewModeButton active={view === 'list'} onClick={() => onChange('list')} label="List view">
        <List className="h-3.5 w-3.5" />
      </ViewModeButton>
    </div>
  )
}

function ViewModeButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'flex h-7 w-8 items-center justify-center rounded-full transition',
        active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

/* -------------------------------------------------------------------------
   CalendarListView: the calendar as a calm day-by-day agenda. Same items,
   same tones, no hour columns. Used by the calendar view switcher.
   ------------------------------------------------------------------------- */
export function CalendarListView({
  items,
  legend,
  onCellClick,
  emptyMessage = 'Nothing scheduled yet',
  emptyHint = 'Sessions appear here as soon as they are added.',
}: Props) {
  const tday = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  const parsed: ParsedChip[] = []
  for (const it of items) {
    const c = parseChip(it)
    if (c) parsed.push(c)
  }

  if (!parsed.length) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <div className="font-semibold text-foreground">{emptyMessage}</div>
        <div className="mt-1 text-sm text-muted-foreground">{emptyHint}</div>
      </div>
    )
  }

  const byDay: Record<string, ParsedChip[]> = {}
  for (const p of parsed) {
    for (const d of p.item.days) {
      ;(byDay[d] ||= []).push(p)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-2 sm:p-4">
      {/* tone legend on top, like the grid keeps it at the bottom */}
      {legend && legend.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 border-b border-border/60 px-1 pb-3">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
              <i className={`${l.tone} inline-block h-2 w-2 rounded-full`} style={{ background: 'var(--tone-txt)' }} />
              {l.label}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col">
        {DAY_KEYS.map((d, di) => {
          const evs = (byDay[d] || []).slice().sort((a, b) => a.startMin - b.startMin)
          if (!evs.length) return null
          const isToday = di === tday
          return (
            <div key={d} className="border-b border-border/50 py-3 first:pt-1 last:border-0">
              <div className="mb-2 flex items-baseline gap-2 px-1">
                <span className={`text-[12px] font-extrabold uppercase tracking-wide ${isToday ? 'text-primary' : 'text-foreground'}`}>
                  {d}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {evs.length} {evs.length === 1 ? 'session' : 'sessions'}
                </span>
                {isToday && (
                  <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                    Today
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                {evs.map((e) => {
                  const Icon = clubIcon(e.item.icon)?.Icon
                  const Comp: React.ElementType = onCellClick ? 'button' : 'div'
                  return (
                    <Comp
                      key={e.item.id + e.startMin}
                      onClick={onCellClick ? () => onCellClick(e.item) : undefined}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${e.item.tone} ${
                        onCellClick ? 'hover:brightness-[1.04] hover:shadow-md' : ''
                      }`}
                      style={{
                        background: 'var(--tone-bg)',
                        borderColor: 'var(--tone-line)',
                        color: 'var(--tone-txt)',
                      }}
                    >
                      <span className="w-[104px] shrink-0 text-[11.5px] font-extrabold tabular-nums leading-tight sm:w-[120px]">
                        {e.label}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-[13px] font-bold leading-tight">
                          {Icon ? (
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <i className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--tone-txt)' }} />
                          )}
                          <span className="truncate">{e.item.code}</span>
                        </span>
                        {(e.item.room || e.item.lead) && (
                          <span className="mt-0.5 block truncate text-[11px] font-semibold opacity-80">
                            {[e.item.room, e.item.lead].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </span>
                    </Comp>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------
   CalendarCardsView: the on-screen version of the "week cards" export.
   Seven symmetric day cards (4 per row on desktop), each listing its
   sessions as calm rows: tone dot, time, name, room · bold lead.
   ------------------------------------------------------------------------- */
export function CalendarCardsView({
  items,
  legend,
  onCellClick,
  emptyMessage = 'Nothing scheduled yet',
  emptyHint = 'Sessions appear here as soon as they are added.',
}: Props) {
  const tday = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  const parsed: ParsedChip[] = []
  for (const it of items) {
    const c = parseChip(it)
    if (c) parsed.push(c)
  }

  if (!parsed.length) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <div className="font-semibold text-foreground">{emptyMessage}</div>
        <div className="mt-1 text-sm text-muted-foreground">{emptyHint}</div>
      </div>
    )
  }

  const byDay: Record<string, ParsedChip[]> = {}
  for (const p of parsed) {
    for (const d of p.item.days) {
      ;(byDay[d] ||= []).push(p)
    }
  }

  const days = DAY_KEYS.map((d, di) => ({
    d,
    di,
    evs: (byDay[d] || []).slice().sort((a, b) => a.startMin - b.startMin),
  }))

  return (
    <div className="rounded-2xl border border-border bg-card p-2 sm:p-4">
      {/* tone legend on top, matching the list view */}
      {legend && legend.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 border-b border-border/60 px-1 pb-3">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
              <i className={`${l.tone} inline-block h-2 w-2 rounded-full`} style={{ background: 'var(--tone-txt)' }} />
              {l.label}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {days.map(({ d, di, evs }) => {
          const isToday = di === tday
          return (
            <div
              key={d}
              className={cn(
                'flex flex-col rounded-2xl border bg-secondary/40 p-3',
                isToday ? 'border-primary/45 shadow-sm' : 'border-border/70',
              )}
            >
              {/* day head */}
              <div className="flex flex-col items-center">
                <span className={cn('text-[13.5px] font-extrabold uppercase tracking-wide', isToday ? 'text-primary' : 'text-foreground')}>
                  {d}
                </span>
                <span className={cn('text-[10.5px] font-semibold', evs.length ? 'text-muted-foreground' : 'text-muted-foreground/60')}>
                  {evs.length ? evs.length + (evs.length === 1 ? ' session' : ' sessions') : 'free day'}
                </span>
              </div>
              <div className="my-2 border-t border-border/60" />

              {!evs.length ? (
                <div className="flex flex-1 items-center justify-center py-3 text-[12px] font-semibold text-muted-foreground/60">
                  No sessions
                </div>
              ) : (
                <div className="flex flex-col">
                  {evs.map((e, i2) => {
                    const tone = TONE_TXT[e.item.tone]
                    const Icon = clubIcon(e.item.icon)?.Icon
                    const Comp: React.ElementType = onCellClick ? 'button' : 'div'
                    return (
                      <Comp
                        key={e.item.id + e.startMin}
                        onClick={onCellClick ? () => onCellClick(e.item) : undefined}
                        className={cn(
                          'flex w-full items-start gap-2 rounded-lg px-1.5 py-1.5 text-left transition',
                          i2 < evs.length - 1 && 'border-b border-border/40',
                          onCellClick && 'hover:bg-secondary/70',
                        )}
                      >
                        {/* tone dot + time */}
                        <span className="w-[62px] shrink-0 pt-px">
                          <span className="flex items-center gap-1">
                            <i className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone }} />
                            <span className="text-[10.5px] font-extrabold tabular-nums leading-tight" style={{ color: tone }}>
                              {e.label}
                            </span>
                          </span>
                          {e.item.room && (
                            <span className="mt-0.5 block truncate pl-2.5 text-[10px] font-semibold text-muted-foreground">
                              {e.item.room}
                            </span>
                          )}
                        </span>
                        {/* name + bold lead */}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1 text-[12px] font-bold leading-tight text-foreground">
                            {Icon ? <Icon className="h-3 w-3 shrink-0" style={{ color: tone }} /> : null}
                            <span className="truncate" dir="auto">{e.item.code}</span>
                          </span>
                          {e.item.lead && (
                            <span className="mt-0.5 block truncate text-[10.5px] font-bold leading-tight text-foreground/75" dir="auto">
                              {e.item.lead}
                            </span>
                          )}
                        </span>
                      </Comp>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* tone class -> solid text color, matching TONE_RGB in export-canvas.ts */
const TONE_TXT: Record<string, string> = {
  'tone-0': '#0A54C4',
  'tone-1': '#A85700',
  'tone-2': '#1E7A3A',
  'tone-3': '#8E44B3',
  'tone-4': '#4A48B8',
  'tone-5': '#C81E45',
  'tone-6': '#0F7A8C',
  'tone-7': '#8A6D00',
  'tone-8': '#5A5A66',
}
