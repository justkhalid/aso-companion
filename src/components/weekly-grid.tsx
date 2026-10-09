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
const ROW_H = 88
const ROW_H_EMPTY = 44 // empty days get half the normal row height

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

const overlaps = (a: { startMin: number; endMin: number }, b: { startMin: number; endMin: number }) =>
  a.startMin < b.endMin && b.startMin < a.endMin

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

  type Parsed = { item: GridItem; startMin: number; endMin: number; label: string }
  const parsed: Parsed[] = []
  for (const it of items) {
    const r = parseRange(it.slot)
    if (!r) continue
    parsed.push({ item: it, startMin: r.startMin, endMin: r.endMin, label: r.label })
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
  const byDay: Record<string, Parsed[]> = {}
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
            const rowH = isEmpty ? ROW_H_EMPTY : ROW_H
            const isToday = di === tday
            const dd = weekMonday ? addDays(weekMonday, di) : null

            // Lane assignment: each event goes into the first lane free at
            // its start time. An event's column count is how many sessions
            // overlap it (itself included), so side-by-side chips split the
            // horizontal space cleanly.
            const lanes: Parsed[][] = []
            const laneEnds: number[] = []
            const laneOf = new Map<string, number>()
            for (const e of evs) {
              let li = laneEnds.findIndex((end) => end <= e.startMin)
              if (li < 0) {
                li = lanes.length
                lanes.push([])
                laneEnds.push(0)
              }
              lanes[li].push(e)
              laneEnds[li] = e.endMin
              laneOf.set(e.item.id, li)
            }
            const stacks = evs.map((e) => ({
              p: e,
              lane: laneOf.get(e.item.id) || 0,
              cols: evs.filter((o) => overlaps(e, o)).length,
            }))

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

                  {/* Event chips, positioned by their real start and end time */}
                  {stacks.map((s) => {
                    const startOffset = s.p.startMin - START_HOUR * 60
                    const duration = s.p.endMin - s.p.startMin
                    const leftPx = (startOffset / 60) * HOUR_WIDTH
                    const widthPx = (duration / 60) * HOUR_WIDTH

                    const colWidth = widthPx / s.cols
                    const chipLeft = leftPx + s.lane * colWidth + 2
                    const chipWidth = colWidth - 4

                    const Icon = clubIcon(s.p.item.icon)?.Icon
                    const Comp: React.ElementType = onCellClick ? 'button' : 'div'
                    return (
                      <div
                        key={s.p.item.id + s.lane}
                        className="absolute"
                        style={{ left: chipLeft, width: chipWidth, top: 5, height: rowH - 10, zIndex: 10 + s.lane }}
                      >
                        <Comp
                          onClick={onCellClick ? () => onCellClick(s.p.item) : undefined}
                          className={`flex h-full w-full flex-col items-start gap-0.5 rounded-lg border px-2 py-1 text-left transition ${s.p.item.tone} ${
                            onCellClick ? 'hover:brightness-[1.04] hover:shadow-md' : ''
                          }`}
                          style={{
                            background: 'var(--tone-bg)',
                            borderColor: 'var(--tone-line)',
                            color: 'var(--tone-txt)',
                            overflow: 'hidden',
                          }}
                        >
                          <span
                            className="flex w-full items-center gap-1 text-[11px] font-bold leading-tight"
                            style={{ color: 'var(--tone-txt)' }}
                          >
                            {Icon ? (
                              <Icon className="h-3 w-3 shrink-0" />
                            ) : (
                              <i className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--tone-txt)' }} />
                            )}
                            <span className="truncate">{s.p.item.code}</span>
                          </span>
                          <span className="text-[9.5px] font-semibold leading-tight tabular-nums" style={{ color: 'var(--tone-txt)' }}>
                            {s.p.label}
                            {s.p.item.room ? ` · ${s.p.item.room}` : ''}
                          </span>
                          {s.p.item.lead && (
                            <span className="truncate text-[9.5px] font-medium leading-tight" style={{ color: 'var(--tone-txt)' }}>
                              {s.p.item.lead}
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
