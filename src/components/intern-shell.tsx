'use client'

import * as React from 'react'
import { DoorOpen, Menu, X } from 'lucide-react'
import { Logo } from './logo'
import { SiteFooter } from './site-footer'
import { ThemeToggle } from './theme-toggle'
import { ClubsPage } from './pages/clubs-page'
import { RoomsPage } from './pages/rooms-page'
import { InternReportPage } from '@/components/pages/intern-report-page'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import type { View } from '@/lib/types'
import { cn } from '@/lib/utils'

/* /interns: the interns' own site, one page per tab like the teachers' site.
   No teacher tabs and no admin menu. */

const NAV: { label: string; view: View; icon?: React.ComponentType<{ className?: string }> }[] = [
  { label: 'Calendar', view: 'intern-public' },
  { label: 'Events', view: 'interns-events' },
  { label: 'Clubs', view: 'interns-clubs' },
  { label: 'Free rooms', view: 'interns-rooms', icon: DoorOpen },
  { label: 'Submit report', view: 'interns-report' },
]

export function InternShell() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const [open, setOpen] = React.useState(false)
  const go = (v: View) => {
    setView(v)
    setOpen(false)
    window.scrollTo(0, 0)
  }

  const item = (n: (typeof NAV)[number], mobile: boolean) => (
    <button
      key={n.view}
      onClick={() => go(n.view)}
      aria-current={view === n.view ? 'page' : undefined}
      className={cn(
        mobile ? 'rounded-full px-4 py-2.5 text-left text-[15px] font-semibold transition' : 'rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
        view === n.view ? (mobile ? 'aso-nav-pill' : 'aso-nav-pill shadow-sm') : 'text-foreground/80 hover:bg-secondary',
      )}
    >
      {n.icon && <n.icon className={mobile ? 'mr-2 inline h-4 w-4 align-[-3px]' : 'mr-1.5 inline h-3.5 w-3.5 align-[-2px]'} />}
      {n.label}
    </button>
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="aso-nav-glass sticky top-0 z-40 border-b border-border">
        <div className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 md:gap-2">
          <button onClick={() => go('landing')} className="col-start-1 flex w-fit items-center gap-2 rounded-full pr-2 text-left" aria-label="ASO Companion home">
            <Logo size={30} />
            <span className="font-display hidden text-[16px] font-extrabold tracking-tight sm:inline">ASO Companion</span>
          </button>
          <nav className="col-start-2 hidden items-center gap-1 justify-self-center md:flex">{NAV.map((n) => item(n, false))}</nav>
          <div className="col-start-3 flex items-center justify-end gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="rounded-full md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        {open && (
          <div className="aso-nav-glass border-t border-border md:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">{NAV.map((n) => item(n, true))}</nav>
          </div>
        )}
      </header>

      <main key={view} className="aso-page flex-1">
        {view === 'intern-public' && <ClubsPage admin={false} internMode section="calendar" />}
        {view === 'interns-events' && <ClubsPage admin={false} internMode section="events" />}
        {view === 'interns-clubs' && <ClubsPage admin={false} internMode section="clubs" />}
        {view === 'interns-rooms' && (
          <div className="mx-auto max-w-5xl px-4 py-7">
            <RoomsPage embedded />
          </div>
        )}
        {view === 'interns-report' && (
          <div className="mx-auto max-w-5xl px-4 py-7">
            <InternReportPage />
          </div>
        )}
      </main>

      <SiteFooter current="interns" />
    </div>
  )
}
