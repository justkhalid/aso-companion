'use client'

import * as React from 'react'
import { DAY_KEYS } from '@/lib/constants'
import { addDays, fmtD, todayKey } from '@/lib/app-utils'
import { clubIcon } from '@/lib/icons'

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
          {/* Hour header row: hours across the top, 09:00 to 18:00 */}
          <div className="sticky top-0 z-20 flex border-b border-border bg-card" style={{ height: 40 }}>
            <div style={{ width: DAY_LABEL_W }} className="shrink-0" />
            {hours.map((h) => (
              <div
                key={h}
                className="flex items-center justify-center text-[11px] font-bold tabular-nums text-muted-foreground"
                style={{ width: HOUR_WIDTH }}
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
