'use client'

import * as React from 'react'
import { Eye, EyeOff, Moon, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { holidayItems, type HolidayRules } from '@/lib/holidays'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/* Settings > Holidays: every holiday of the year in one list. Dates that follow the moon can be moved when the
   sighting differs; any holiday can be hidden or marked closed or open; the admin can add their own. */
export function HolidaysPanel() {
  const rules = useStore((s) => s.state.settings.holidays) as HolidayRules | undefined
  const setSettings = useStore((s) => s.setSettings)
  const [year, setYear] = React.useState(new Date().getFullYear())
  const [nd, setNd] = React.useState('')
  const [nn, setNn] = React.useState('')
  const [nc, setNc] = React.useState(true)
  const [ny, setNy] = React.useState(true)

  /* the list is rebuilt from the saved rules */
  const items = React.useMemo(() => holidayItems(year), [year, rules])
  const edit = (fn: (r: HolidayRules) => void) => setSettings((x) => { const r: HolidayRules = x.holidays || {}; fn(r); x.holidays = r })

  const byMonth = MONTHS.map((m, i) => ({ m, list: items.filter((h) => Number(h.date.slice(5, 7)) === i + 1 && h.date.startsWith(String(year))) })).filter((g) => g.list.length)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setYear((y) => y - 1)} aria-label="Previous year">‹</Button>
        <b className="min-w-[4rem] text-center text-sm">{year}</b>
        <Button size="sm" variant="outline" onClick={() => setYear((y) => y + 1)} aria-label="Next year">›</Button>
        <span className="ml-2 text-xs text-muted-foreground">Dates marked with a moon follow the moon: change the date when the sighting is announced.</span>
      </div>

      {byMonth.map((g) => (
        <div key={g.m}>
          <h4 className="mb-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">{g.m}</h4>
          <div className="flex flex-col gap-1.5">
            {g.list.map((h) => {
              const moved = h.date !== h.original
              return (
                <div key={h.id} className={cn('flex flex-wrap items-center gap-2 rounded-lg border border-border p-2.5', h.hidden && 'opacity-50')}>
                  <Input
                    type="date"
                    className="h-8 w-[10.5rem]"
                    value={h.date}
                    disabled={h.custom}
                    onChange={(e) => e.target.value && edit((r) => { r.moved = { ...(r.moved || {}), [h.id]: e.target.value } })}
                    aria-label={`Date of ${h.name}`}
                  />
                  <span className="min-w-[8rem] flex-1 text-sm font-semibold">
                    {h.name}
                    {h.moon && <Moon className="ml-1.5 inline h-3.5 w-3.5 text-muted-foreground" aria-label="follows the moon" />}
                    {h.custom && <small className="ml-1.5 text-[11px] font-medium text-muted-foreground">{h.yearly ? 'yearly' : 'this year only'}</small>}
                  </span>
                  <button
                    type="button"
                    className={cn('rounded-full px-2.5 py-1 text-xs font-bold', h.closed ? 'bg-red-500/15 text-red-700 dark:text-red-300' : 'bg-secondary text-muted-foreground')}
                    onClick={() => (h.custom ? edit((r) => { r.custom = (r.custom || []).map((c) => (`c:${c.id}` === h.id ? { ...c, closed: !h.closed } : c)) }) : edit((r) => { r.closed = { ...(r.closed || {}), [h.id]: !h.closed } }))}
                    title="Is the space closed that day?"
                  >
                    {h.closed ? 'Space closed' : 'Space open'}
                  </button>
                  {moved && !h.custom && (
                    <button type="button" className="rounded p-1 text-muted-foreground hover:bg-secondary" title="Back to the expected date" onClick={() => edit((r) => { const m = { ...(r.moved || {}) }; delete m[h.id]; r.moved = m })}>
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {h.custom ? (
                    <button type="button" className="rounded p-1 text-destructive hover:bg-destructive/10" title="Remove" onClick={() => edit((r) => { r.custom = (r.custom || []).filter((c) => `c:${c.id}` !== h.id) })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button type="button" className="rounded p-1 text-muted-foreground hover:bg-secondary" title={h.hidden ? 'Show on the calendars' : 'Hide from the calendars'} onClick={() => edit((r) => { const hd = new Set(r.hidden || []); if (hd.has(h.id)) hd.delete(h.id); else hd.add(h.id); r.hidden = [...hd] })}>
                      {h.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div className="rounded-xl border border-dashed border-border p-3">
        <h4 className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Add a holiday</h4>
        <div className="grid gap-2 sm:grid-cols-[11rem_1fr_auto]">
          <Input type="date" value={nd} onChange={(e) => setNd(e.target.value)} aria-label="Date" />
          <Input placeholder="Name, for example Teachers' Day" value={nn} onChange={(e) => setNn(e.target.value)} />
          <Button
            size="sm"
            disabled={!nd || !nn.trim()}
            onClick={() => {
              edit((r) => { r.custom = [...(r.custom || []), { id: Math.random().toString(36).slice(2, 9), date: nd, name: nn.trim(), closed: nc, yearly: ny }] })
              setNd(''); setNn('')
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={ny} onChange={(e) => setNy(e.target.checked)} /> Every year on this date</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={nc} onChange={(e) => setNc(e.target.checked)} /> The space is closed</label>
        </div>
      </div>
    </div>
  )
}
