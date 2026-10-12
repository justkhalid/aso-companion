'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { downloadMonth, monthLabel, renderMonth } from '@/lib/month-export'
import { cn } from '@/lib/utils'

const EVT = 'aso-month-export'

/** opens the monthly export from anywhere (an export menu entry) */
export function openMonthExport() {
  window.dispatchEvent(new CustomEvent(EVT))
}

/* mounted once for the whole site: pick a month, choose clubs and/or events, see the picture, download it */
export function MonthExportHost() {
  const state = useStore((s) => s.state)
  const toast = useStore((s) => s.toast)
  const now = new Date()
  const [open, setOpen] = React.useState(false)
  const [ym, setYm] = React.useState({ year: now.getFullYear(), month: now.getMonth() })
  const [clubs, setClubs] = React.useState(true)
  const [events, setEvents] = React.useState(true)
  const [holidays, setHolidays] = React.useState(true)
  const [preview, setPreview] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    const on = () => setOpen(true)
    window.addEventListener(EVT, on)
    return () => window.removeEventListener(EVT, on)
  }, [])

  React.useEffect(() => {
    if (!open || (!clubs && !events)) {
      setPreview('')
      return
    }
    let alive = true
    setBusy(true)
    void renderMonth(state, { ...ym, clubs, events, holidays })
      .then((c) => {
        if (alive) setPreview(c.toDataURL('image/jpeg', 0.7))
      })
      .finally(() => alive && setBusy(false))
    return () => {
      alive = false
    }
  }, [open, ym.year, ym.month, clubs, events, holidays, state])

  const step = (n: number) => setYm((v) => {
    const d = new Date(v.year, v.month + n, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const toggle = (label: string, on: boolean, set: (v: boolean) => void) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => set(!on)}
      className={cn('rounded-full border px-4 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', on ? 'aso-nav-pill border-transparent' : 'border-border bg-secondary text-foreground/80')}
    >
      {label}
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Monthly calendar</DialogTitle>
          <DialogDescription>Clubs and events for one month as a calendar picture with big, readable names and times.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-full border border-border bg-secondary/60 p-1">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => step(-1)} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-36 text-center text-sm font-extrabold" aria-live="polite">{monthLabel(ym.year, ym.month)}</div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => step(1)} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div role="group" aria-label="What to include" className="flex gap-1.5">
            {toggle('Clubs', clubs, setClubs)}
            {toggle('Events', events, setEvents)}
            {toggle('Holidays', holidays, setHolidays)}
          </div>
        </div>
        <div className="max-h-[48vh] min-h-40 overflow-auto rounded-2xl border border-border bg-secondary/40 p-2">
          {!clubs && !events ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Choose clubs, events or both.</p>
          ) : preview ? (
            <img src={preview} alt={`Preview of the ${monthLabel(ym.year, ym.month)} calendar`} className={cn('mx-auto w-full rounded-lg', busy && 'opacity-60')} />
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">Preparing the preview...</p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Close</Button>
          <Button
            type="button"
            disabled={(!clubs && !events) || busy}
            onClick={async () => {
              const ok = await downloadMonth(state, { ...ym, clubs, events, holidays })
              toast(ok ? 'Image downloaded' : 'Could not create the image', ok)
            }}
          >
            <Download className="h-4 w-4" /> Download PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
