'use client'

import * as React from 'react'
import { Logo } from './logo'
import { ThemeToggle } from './theme-toggle'
import { ClubsPage } from './pages/clubs-page'

/* /interns: the clubs and events section on its own, for ASO interns.
   No teacher tabs, no admin menu and no sign-in link: one page with a
   short jump bar to its three parts. */

const JUMPS = [
  { id: 'calendar', label: 'Weekly calendar' },
  { id: 'events', label: 'Upcoming events' },
  { id: 'clubs', label: 'All clubs' },
]

export function InternShell() {
  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="aso-nav-glass sticky top-0 z-40 border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Logo size={30} />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="font-display truncate text-[16px] font-extrabold tracking-tight">ASO Companion</div>
            <div className="truncate text-[11px] font-semibold text-muted-foreground">Clubs and events for interns</div>
          </div>
          <ThemeToggle />
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1.5 overflow-x-auto px-4 pb-2" aria-label="On this page">
          {JUMPS.map((j) => (
            <button
              key={j.id}
              onClick={() => jump(j.id)}
              className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-foreground/80 transition hover:bg-secondary/70"
            >
              {j.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1">
        <ClubsPage admin={false} internMode />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-5 text-xs text-muted-foreground">
          <Logo size={20} />
          <span>ASO Companion · American Space Oujda</span>
        </div>
      </footer>
    </div>
  )
}
