'use client'

import * as React from 'react'
import { Logo } from './logo'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/* One footer for every page: it switches between the three sides of the site
   (the public main page, the teachers' site, the interns' page) and holds the admin entry. */

export type Side = 'public' | 'teachers' | 'interns'

export function SiteFooter({ current }: { current: Side }) {
  const setView = useStore((s) => s.setView)
  const setPubView = useStore((s) => s.setPubView)
  const admin = useStore((s) => s.admin)
  const viewer = useStore((s) => s.viewer)
  const signOutViewer = useStore((s) => s.signOutViewer)

  const links: { side: Side; label: string; go: () => void }[] = [
    { side: 'public', label: 'Main page', go: () => setView('landing') },
    { side: 'teachers', label: 'Teachers', go: () => setView('home') },
    { side: 'interns', label: 'Interns', go: () => setView('intern-public') },
  ]

  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <Logo size={24} />
          <span className="text-xs text-muted-foreground">American Space Oujda · {new Date().getFullYear()}</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-semibold" aria-label="Switch between sections of the site">
          {links.map((l) => (
            <button
              key={l.side}
              onClick={l.go}
              aria-current={current === l.side ? 'page' : undefined}
              className={cn(current === l.side ? 'text-foreground underline underline-offset-4' : 'text-muted-foreground hover:text-foreground')}
            >
              {l.label}
            </button>
          ))}
          {!admin && (viewer.teacher || viewer.intern) && (
            <button onClick={signOutViewer} className="text-muted-foreground hover:text-foreground">Sign out</button>
          )}
          {admin ? (
            <button onClick={() => { setPubView(false); setView('home') }} className="text-primary hover:underline">Open admin menu</button>
          ) : (
            <button onClick={() => setView('login')} className="text-primary hover:underline">Admin sign in</button>
          )}
        </nav>
      </div>
    </footer>
  )
}
