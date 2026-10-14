'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Download, MapPin } from 'lucide-react'
import { useStore } from '@/lib/store'
import { downloadMonth, monthLabel, renderMonth } from '@/lib/month-export'
import { downloadRoomsMonth, outsideDay, renderRoomsMonth, roomDayDetail, roomStatus, roomsCells } from '@/lib/month-rooms'
import { fmt12Min, fmtTime as fmtSlot, roomOptionsFor } from '@/lib/app-utils'
import { renderBackdropLayers, type MotifSprite } from '@/lib/month-frame'
import { ACTIVITY, STATUS } from '@/lib/activity-colors'
import { Button } from '@/components/ui/button'

const KIND_INK = { class: ACTIVITY.class.ink, club: ACTIVITY.club.ink, event: ACTIVITY.event.ink }

/* what is in each room on the tapped day: bookings with their time, and the free hours */
function RoomDayCard({ iso, onClose }: { iso: string; onClose: () => void }) {
  const state = useStore((s) => s.state)
  const rows = roomDayDetail(state, iso).map((r) => ({ ...r, status: roomStatus(r.slots, r.closed) }))
  const away = outsideDay(state, iso)
  const d = new Date(iso + 'T00:00:00')
  return (
    <div className="aso-tab-in mt-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="text-base font-extrabold">{d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <button type="button" onClick={onClose} className="ml-auto rounded-full px-3 py-1 text-xs font-bold text-muted-foreground hover:bg-secondary">Close</button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.room} className="rounded-xl border border-border p-3">
            <div className="mb-1 flex items-center gap-2 text-sm font-bold">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: r.status === 'closed' ? STATUS.closed.ink : r.status === 'free' ? STATUS.free.ink : r.status === 'booked' ? ACTIVITY.event.ink : `linear-gradient(90deg, ${STATUS.free.ink} 50%, ${ACTIVITY.event.ink} 50%)` }}
              />
              {r.room}
              <span className="ml-auto text-xs font-semibold text-muted-foreground">{{ closed: 'Not available', free: 'Free', part: 'Partially booked', booked: 'Booked' }[r.status]}</span>
            </div>
            {r.closed ? (
              <div className="text-sm text-muted-foreground">{r.holiday ? `Space closed: ${r.holiday}` : 'This room is not open on this day.'}</div>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {r.slots.map((sl, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-bold" style={{ color: KIND_INK[sl.kind] }} dir="auto">{sl.name}</span>
                    <span className="text-muted-foreground">{fmt12Min(sl.start)} - {fmt12Min(sl.end)}</span>
                  </li>
                ))}
                {r.free.length === 0 && r.slots.length > 0 && <li className="font-semibold text-muted-foreground">No free time</li>}
                {r.free.map(([a, b], i) => (
                  <li key={'f' + i} className="font-semibold" style={{ color: STATUS.free.ink }}>Free {fmt12Min(a)} - {fmt12Min(b)}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {away.length > 0 && (
          <div className="rounded-xl border border-dashed border-border p-3 sm:col-span-2">
            <div className="mb-1 flex items-center gap-2 text-sm font-bold"><MapPin className="h-3.5 w-3.5" aria-hidden /> Outside the space</div>
            <ul className="flex flex-col gap-1 text-sm">
              {away.map((a, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-bold" style={{ color: KIND_INK[a.kind] }} dir="auto">{a.title}</span>
                  <span className="text-muted-foreground">{fmtSlot(a.time)} · {a.place}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

/* the month calendar picture shown on the page: arrows to change month, a download button; in the rooms version a tap on a day opens that day's detail */
export function MonthCalendarImage({ clubs = true, events = true, classes = false, stepper = true, rooms = false }: { clubs?: boolean; events?: boolean; classes?: boolean; stepper?: boolean; rooms?: boolean }) {
  const state = useStore((s) => s.state)
  const toast = useStore((s) => s.toast)
  const now = new Date()
  const [ym, setYm] = React.useState({ year: now.getFullYear(), month: now.getMonth() })
  const [src, setSrc] = React.useState('')
  const [back, setBack] = React.useState<{ bg: string; sprites: MotifSprite[] } | null>(null)
  const [busy, setBusy] = React.useState(true)
  const [pick, setPick] = React.useState<string | null>(null)

  React.useEffect(() => {
    let alive = true
    setBusy(true)
    /* three layers: the plain themed page, every leaf on its own, and the calendar itself on clear glass over them */
    void (rooms ? renderRoomsMonth(state, { ...ym, transparent: true }, null) : renderMonth(state, { ...ym, clubs, events, classes, holidays: true, transparent: true }))
      .then((c) => {
        if (!alive) return
        setBack(renderBackdropLayers(ym.month))
        setSrc(c.toDataURL('image/webp', 0.92))
      })
      .catch(() => {
        if (alive) setSrc('')
      })
      .finally(() => alive && setBusy(false))
    return () => {
      alive = false
    }
  }, [state, ym.year, ym.month, clubs, events, classes, rooms])

  const step = (n: number) => {
    setPick(null)
    setYm((v) => {
      const d = new Date(v.year, v.month + n, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }
  const done = (ok: boolean) => toast(ok ? 'Image downloaded' : 'Nothing to export', ok)
  const roomNames = rooms ? roomOptionsFor(state).filter((r) => r !== 'Online') : []
  const cells = rooms ? roomsCells(ym.year, ym.month) : []

  return (
    <div>
      {stepper && (
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => step(-1)} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-40 text-center text-base font-extrabold" aria-live="polite">{monthLabel(ym.year, ym.month)}</div>
          <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => step(1)} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void (rooms ? downloadRoomsMonth(state, ym, null) : downloadMonth(state, { ...ym, clubs, events, classes, holidays: true })).then(done)}
          >
            <Download className="h-4 w-4" aria-hidden /> Download calendar
          </Button>
          {rooms && (
            <select
              aria-label="Download the calendar of one room"
              value=""
              onChange={(e) => {
                const r = e.target.value
                if (r) void downloadRoomsMonth(state, ym, r).then(done)
              }}
              className="h-8 rounded-full border border-border bg-background px-3 text-sm font-medium"
            >
              <option value="">Download one room...</option>
              {roomNames.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}
        </div>
      )}
      <div className="aso-alive relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {src ? (
          <>
            {back && (
              <div className="absolute inset-0" aria-hidden>
                <img src={back.bg} alt="" className="block h-full w-full" />
                {back.sprites.map((sp, i) => (
                  <img
                    key={i}
                    src={sp.url}
                    alt=""
                    draggable={false}
                    className="aso-sprite absolute"
                    style={{ left: sp.left * 100 + '%', top: sp.top * 100 + '%', width: sp.w * 100 + '%', height: sp.h * 100 + '%', ['--turn' as string]: sp.turn + 'deg', ['--dur' as string]: sp.dur + 's', ['--delay' as string]: sp.delay + 's' }}
                  />
                ))}
              </div>
            )}
            <img src={src} alt={`${rooms ? 'Free rooms' : 'Calendar of clubs and events'}, ${monthLabel(ym.year, ym.month)}`} className="relative block h-auto w-full" />
            {rooms &&
              cells.map((c) => (
                <button
                  key={c.iso}
                  type="button"
                  data-no-motion
                  aria-label={`${c.day} ${monthLabel(ym.year, ym.month)}: show the rooms`}
                  onClick={() => setPick(pick === c.iso ? null : c.iso)}
                  className={'absolute rounded-sm transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ' + (pick === c.iso ? 'ring-2 ring-primary bg-primary/10' : '')}
                  style={{ left: c.x * 100 + '%', top: c.y * 100 + '%', width: c.w * 100 + '%', height: c.h * 100 + '%' }}
                />
              ))}
          </>
        ) : (
          <div className="flex aspect-video items-center justify-center text-sm text-muted-foreground">{busy ? 'Loading the calendar...' : 'The calendar could not be drawn.'}</div>
        )}
      </div>
      {rooms && !pick && src && <p className="mt-2 text-center text-xs text-muted-foreground">Tap a day to see who has each room and when it is free.</p>}
      {rooms && pick && <RoomDayCard key={pick} iso={pick} onClose={() => setPick(null)} />}
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
