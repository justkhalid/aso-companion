'use client'

import * as React from 'react'
import { CalendarDays, CalendarClock, DoorOpen, Sparkles } from 'lucide-react'
import { Logo } from './logo'
import { SiteFooter } from './site-footer'
import { ThemeToggle } from './theme-toggle'
import { ClubsPage } from './pages/clubs-page'
import { RoomsPage } from './pages/rooms-page'
import { cn } from '@/lib/utils'

/* /interns: the clubs and events section on its own, for ASO interns.
   No teacher tabs, no admin menu and no sign-in link: one page with a
   jump bar that follows the scroll position. */

const JUMPS = [
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'events', label: 'Events', icon: CalendarClock },
  { id: 'clubs', label: 'Clubs', icon: Sparkles },
  { id: 'rooms', label: 'Free rooms', icon: DoorOpen },
]

/* the section the reader is in: the last one whose top has passed the header */
function useActiveSection(ids: string[]) {
  const [active, setActive] = React.useState(ids[0])
  React.useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const line = 150
      let cur = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= line) cur = id
      }
      /* at the very bottom the last section wins even if it is short */
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = ids[ids.length - 1]
      setActive(cur)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [ids])
  return active
}

const IDS = JUMPS.map((j) => j.id)

export function InternShell() {
  const active = useActiveSection(IDS)
  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const tabs = (
    <nav className="flex items-center gap-1" aria-label="On this page">
      {JUMPS.map((j) => {
        const on = active === j.id
        return (
          <button
            key={j.id}
            onClick={() => jump(j.id)}
            aria-current={on ? 'true' : undefined}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
              on ? 'aso-nav-pill shadow-sm' : 'text-foreground/80 hover:bg-secondary',
            )}
          >
            <j.icon className="h-3.5 w-3.5" />
            {j.label}
          </button>
        )
      })}
    </nav>
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="aso-nav-glass sticky top-0 z-40 border-b border-border">
        <div className="mx-auto grid h-14 max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Logo size={30} />
            <div className="min-w-0 leading-tight">
              <div className="font-display truncate text-[16px] font-extrabold tracking-tight">ASO Companion</div>
              <div className="hidden truncate text-[11px] font-semibold text-muted-foreground sm:block">Clubs and events for interns</div>
            </div>
          </div>
          <div className="hidden md:block">{tabs}</div>
          <div className="col-start-3 flex justify-end md:col-start-3">
            <ThemeToggle />
          </div>
        </div>
        {/* phones: the same tabs on their own row, scrolling sideways */}
        <div className="mx-auto max-w-5xl overflow-x-auto px-4 pb-2 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{tabs}</div>
      </header>

      <main className="flex-1">
        <ClubsPage admin={false} internMode />
        <section id="rooms" className="mx-auto max-w-5xl scroll-mt-28 px-4 pb-10 pt-7">
          <RoomsPage embedded />
        </section>
      </main>

      <SiteFooter current="interns" />
    </div>
  )
}
