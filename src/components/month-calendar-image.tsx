'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useStore } from '@/lib/store'
import { downloadMonth, monthLabel, renderMonth } from '@/lib/month-export'
import { Button } from '@/components/ui/button'

/* the month calendar picture shown on the page: arrows to change month, a download button for the admin */
export function MonthCalendarImage({ clubs = true, events = true, classes = false, stepper = true }: { clubs?: boolean; events?: boolean; classes?: boolean; stepper?: boolean }) {
  const state = useStore((s) => s.state)
  const toast = useStore((s) => s.toast)
  const now = new Date()
  const [ym, setYm] = React.useState({ year: now.getFullYear(), month: now.getMonth() })
  const [src, setSrc] = React.useState('')
  const [busy, setBusy] = React.useState(true)

  React.useEffect(() => {
    let alive = true
    setBusy(true)
    void renderMonth(state, { ...ym, clubs, events, classes, holidays: true })
      .then((c) => {
        if (alive) setSrc(c.toDataURL('image/jpeg', 0.88))
      })
      .catch(() => {
        if (alive) setSrc('')
      })
      .finally(() => alive && setBusy(false))
    return () => {
      alive = false
    }
  }, [state, ym.year, ym.month, clubs, events, classes])

  const step = (n: number) =>
    setYm((v) => {
      const d = new Date(v.year, v.month + n, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })

  return (
    <div>
      {stepper && <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        {stepper && (
          <>
        <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => step(-1)} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-40 text-center text-base font-extrabold" aria-live="polite">{monthLabel(ym.year, ym.month)}</div>
        <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => step(1)} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </Button>
          </>
        )}
        {(
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void downloadMonth(state, { ...ym, clubs, events, classes, holidays: true }).then((ok) => toast(ok ? 'Image downloaded' : 'Nothing to export', ok))}
          >
            <Download className="h-4 w-4" aria-hidden /> Download calendar
          </Button>
        )}
      </div>}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {src ? (
          <img src={src} alt={`Calendar of clubs and events, ${monthLabel(ym.year, ym.month)}`} className="block h-auto w-full" />
        ) : (
          <div className="flex aspect-video items-center justify-center text-sm text-muted-foreground">{busy ? 'Loading the calendar...' : 'The calendar could not be drawn.'}</div>
        )}
      </div>
    </div>
  )
}

/* "Download calendar" for the current month, used where the picture has no month arrows */
export function DownloadCalendarButton({ clubs = true, events = true, classes = false }: { clubs?: boolean; events?: boolean; classes?: boolean }) {
  const state = useStore((s) => s.state)
  const toast = useStore((s) => s.toast)
  const now = new Date()
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void downloadMonth(state, { year: now.getFullYear(), month: now.getMonth(), clubs, events, classes, holidays: true }).then((ok) => toast(ok ? 'Image downloaded' : 'Nothing to export', ok))}
    >
      <Download className="h-4 w-4" aria-hidden /> Download calendar
    </Button>
  )
}
