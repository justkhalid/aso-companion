'use client'

import * as React from 'react'
import { Menu, X } from 'lucide-react'
import { Logo } from './logo'
import { ThemeToggle } from './theme-toggle'
import { useStore } from '@/lib/store'
import type { View } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  view: View
}

const NAV: NavItem[] = [
  { label: 'Home', view: 'home' },
  { label: 'ELTASO', view: 'eltaso' },
  { label: 'Clubs & events', view: 'clubs' },
  { label: 'Resources', view: 'resources' },
]

export function PublicNav() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const [open, setOpen] = React.useState(false)

  const go = (v: View) => {
    setView(v)
    setOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      {/* The grid layout: [logo | nav (centered) | actions]. The nav is in
          the middle column and centered by justify-self-center, while the
          logo and actions occupy the side columns. */}
      <div className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 md:gap-2">
        {/* logo (left) */}
        <button
          onClick={() => go('home')}
          className="flex items-center gap-2 rounded-md pr-2 text-left"
          aria-label="ASO Companion home"
        >
          <Logo size={30} />
          <span className="hidden text-[15px] font-extrabold tracking-tight sm:inline">
            ASO Companion
          </span>
        </button>

        {/* centered desktop nav */}
        <nav className="hidden items-center gap-1 justify-self-center md:flex">
          {NAV.map((item) => {
            const active = view === item.view || (item.view === 'eltaso' && view === 'level-detail')
            return (
              <button
                key={item.view}
                onClick={() => go(item.view)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-semibold transition',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground/80 hover:bg-secondary',
                )}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* right side */}
        <div className="flex items-center justify-end gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* mobile dropdown */}
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV.map((item) => {
              const active = view === item.view || (item.view === 'eltaso' && view === 'level-detail')
              return (
                <button
                  key={item.view}
                  onClick={() => go(item.view)}
                  className={cn(
                    'rounded-md px-3 py-2.5 text-left text-[15px] font-semibold',
                    active ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary',
                  )}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
