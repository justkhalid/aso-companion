'use client'

import * as React from 'react'
import { DAY_KEYS } from '@/lib/constants'
import { cn } from '@/lib/utils'

/* day-of-week pills used in class/club/event forms */
export function DayPills({
  value,
  onChange,
}: {
  value: string[]
  onChange: (days: string[]) => void
}) {
  const set = new Set(value)
  const toggle = (d: string) => {
    const next = new Set(set)
    if (next.has(d)) next.delete(d)
    else next.add(d)
    onChange(Array.from(next))
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {DAY_KEYS.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => toggle(d)}
          className={cn(
            'rounded-md border px-3 py-1 text-xs font-bold transition',
            set.has(d)
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-secondary text-muted-foreground hover:bg-secondary/80',
          )}
        >
          {d}
        </button>
      ))}
    </div>
  )
}

/* 24h time range input - two HH:MM fields joined by a dash */
export function TimeRangeInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [start, end] = React.useMemo(() => {
    const m = String(value || '').match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/)
    return m ? [m[1], m[2]] : ['', '']
  }, [value])

  const set = (s: string, e: string) => {
    if (s && e) onChange(`${s}-${e}`)
    else onChange(s || e)
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="time"
        value={start}
        onChange={(ev) => set(ev.target.value, end)}
        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <span className="text-muted-foreground">–</span>
      <input
        type="time"
        value={end}
        onChange={(ev) => set(start, ev.target.value)}
        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
    </div>
  )
}

/* skill tag picker for library folders */
export function SkillPicker({
  value,
  onChange,
}: {
  value: string[]
  onChange: (sk: string[]) => void
}) {
  const SK = ['L', 'S', 'R', 'W']
  const set = new Set(value)
  const toggle = (k: string) => {
    const next = new Set(set)
    if (next.has(k)) next.delete(k)
    else next.add(k)
    onChange(Array.from(next))
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {SK.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => toggle(k)}
          className={cn(
            'rounded-md border px-3 py-1 text-xs font-bold transition',
            set.has(k)
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-secondary text-muted-foreground',
          )}
        >
          {k}
        </button>
      ))}
    </div>
  )
}
