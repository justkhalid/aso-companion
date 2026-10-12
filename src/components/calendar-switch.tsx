'use client'

import * as React from 'react'
import { CalendarDays, GraduationCap } from 'lucide-react'

/* the switch between the clubs and events calendar and the classes: two clear buttons, the chosen one filled */
export type CalTab = 'cluev' | 'classes'

export function CalendarSwitch({ tab, onChange, large = false }: { tab: CalTab; onChange: (t: CalTab) => void; large?: boolean }) {
  const items: { k: CalTab; label: string; icon: React.ElementType }[] = [
    { k: 'cluev', label: 'Clubs and events', icon: CalendarDays },
    { k: 'classes', label: 'Classes', icon: GraduationCap },
  ]
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card p-1.5 shadow-sm" role="tablist" aria-label="What to show">
      {items.map(({ k, label, icon: Icon }) => {
        const on = tab === k
        return (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(k)}
            className={
              'inline-flex cursor-pointer items-center gap-2 rounded-full font-bold transition-colors ' +
              (large ? 'px-6 py-2.5 text-base ' : 'px-5 py-2 text-sm ') +
              (on ? 'aso-nav-pill shadow-md' : 'text-foreground/75 hover:bg-primary/10 hover:text-foreground')
            }
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )
}
