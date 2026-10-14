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
            <button onClick={() => { setPubView(false); setView('dashboard') }} className="text-primary hover:underline">Open admin menu</button>
          ) : (
            <button onClick={() => setView('login')} className="text-primary hover:underline">Admin sign in</button>
          )}
        </nav>
      </div>
      {/* the name across the full width, with a slow marbled texture inside the letters */}
      <div className="mx-auto max-w-6xl select-none overflow-hidden px-4 pb-3 pt-2">
        <svg viewBox="0 0 1000 132" className="block h-auto w-full text-[#1e3a8a] dark:text-[#9db8ff]" role="img" aria-label="American Space Oujda">
          <defs>
            <filter id="aso-marble" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.007 0.02" numOctaves="3" seed="11" result="n" />
              <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 11 -5.3" result="blot" />
              <feFlood floodColor="currentColor" result="ink" />
              <feComposite in="ink" in2="blot" operator="in" />
            </filter>
            <mask id="aso-wordmark">
              <text x="0" y="96" textLength="1000" lengthAdjust="spacingAndGlyphs" fill="#fff" style={{ fontFamily: 'var(--font-playfair), serif', fontWeight: 800, fontSize: 112 }}>
                American Space Oujda
              </text>
            </mask>
          </defs>
          <g mask="url(#aso-wordmark)">
            <rect x="-260" y="0" width="1520" height="132" className="fill-foreground/[.13]" />
            <g className="aso-marble">
              <rect x="-260" y="0" width="1520" height="132" filter="url(#aso-marble)" />
            </g>
          </g>
        </svg>
      </div>
    </footer>
  )
}
