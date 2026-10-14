'use client'

import * as React from 'react'
import { CalendarDays, DoorOpen, GraduationCap } from 'lucide-react'

/* the switch between the clubs and events calendar and the classes: two clear buttons, the chosen one filled */
export type CalTab = 'cluev' | 'classes' | 'rooms'

export function CalendarSwitch({ tab, onChange, large = false, rooms = false, counts }: { tab: CalTab; onChange: (t: CalTab) => void; large?: boolean; rooms?: boolean; counts?: Partial<Record<CalTab, number>> }) {
  const items: { k: CalTab; label: string; icon: React.ElementType }[] = [
    { k: 'cluev', label: 'Clubs and events', icon: CalendarDays },
    { k: 'classes', label: 'Classes', icon: GraduationCap },
    ...(rooms ? [{ k: 'rooms' as CalTab, label: 'Rooms', icon: DoorOpen }] : []),
  ]
  const wrap = React.useRef<HTMLDivElement>(null)
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({})
  const [pill, setPill] = React.useState<{ left: number; width: number } | null>(null)
  const [ready, setReady] = React.useState(false)

  /* the filled pill slides under whichever button is chosen */
  const measure = React.useCallback(() => {
    const b = refs.current[tab]
    const w = wrap.current
    if (b && w) setPill({ left: b.offsetLeft, width: b.offsetWidth })
  }, [tab])
  React.useLayoutEffect(() => {
    measure()
  }, [measure])
  React.useEffect(() => {
    const id = window.requestAnimationFrame(() => setReady(true)) // no slide on the very first paint
    const ro = new ResizeObserver(measure)
    if (wrap.current) ro.observe(wrap.current)
    return () => {
      window.cancelAnimationFrame(id)
      ro.disconnect()
    }
  }, [measure])

  return (
    <div ref={wrap} className="relative inline-flex items-center gap-1.5 rounded-full border border-border bg-card p-1.5 shadow-sm" role="tablist" aria-label="What to show">
      {pill && (
        <span
          aria-hidden
          className="aso-nav-pill pointer-events-none absolute top-1.5 bottom-1.5 rounded-full shadow-md"
          style={{
            left: pill.left,
            width: pill.width,
            transition: ready ? 'left .5s cubic-bezier(.65,0,.25,1), width .5s cubic-bezier(.65,0,.25,1)' : 'none',
          }}
        />
      )}
      {items.map(({ k, label, icon: Icon }) => {
        const on = tab === k
        return (
          <button
            key={k}
            ref={(el) => {
              refs.current[k] = el
            }}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(k)}
            className={
              'relative z-10 inline-flex cursor-pointer items-center gap-2 rounded-full font-bold transition-colors duration-300 ' +
              (large ? 'px-6 py-2.5 text-base ' : 'px-5 py-2 text-sm ') +
              (on ? 'text-white' : 'text-foreground/75 hover:text-foreground')
            }
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
            {counts?.[k] !== undefined && (
              <span className={'rounded-full px-1.5 py-px text-[11px] font-bold tabular-nums transition-colors duration-300 ' + (on ? 'bg-white/25 text-white' : 'bg-secondary text-muted-foreground')}>{counts[k]}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
