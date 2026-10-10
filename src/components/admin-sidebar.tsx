'use client'

import * as React from 'react'
import {
  LayoutDashboard,
  CalendarRange,
  CalendarClock,
  HeartHandshake,
  GraduationCap,
  Users,
  CalendarDays,
  FileText,
  Settings,
  LogOut,
  Eye,
  Menu,
  Sparkles,
  FolderOpen,
  DoorOpen,
  UserX,
} from 'lucide-react'
import { Logo } from './logo'
import { ThemeToggle } from './theme-toggle'
import { useStore } from '@/lib/store'
import type { View } from '@/lib/types'
import { termStatus } from '@/lib/app-utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { QuickAdd } from '@/components/admin/quick-add'

interface NavGroup {
  label: string
  items: { label: string; view: View; icon: React.ElementType }[]
}

function useNavGroups(): NavGroup[] {
  return [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', view: 'dashboard', icon: LayoutDashboard },
        { label: 'Week schedule', view: 'home', icon: CalendarRange },
      ],
    },
    {
      label: 'Teaching',
      items: [
        { label: 'Classes', view: 'classes', icon: Users },
        { label: 'Levels and plans', view: 'eltaso', icon: GraduationCap },
        { label: 'Library', view: 'library', icon: FolderOpen },
        { label: 'Reports', view: 'reports', icon: FileText },
      ],
    },
    {
      label: 'Clubs and events',
      items: [
        { label: 'Calendar', view: 'clubs', icon: CalendarDays },
        { label: 'Clubs', view: 'intern-clubs', icon: Sparkles },
        { label: 'Events', view: 'intern-events', icon: CalendarClock },
        { label: 'Volunteers', view: 'intern-volunteers', icon: HeartHandshake },
      ],
    },
    {
      label: 'Spaces and people',
      items: [
        { label: 'Rooms', view: 'rooms', icon: DoorOpen },
        { label: 'Absences', view: 'absences', icon: UserX },
        { label: 'Team', view: 'team', icon: Users },
      ],
    },
  ]
}

export function pageTitle(view: View, selectedLevelKey: string, levelLabel?: string): string {
  switch (view) {
    case 'dashboard': return 'Dashboard'
    case 'home': return 'Week schedule'
    case 'eltaso': return 'Levels and plans'
    case 'level-detail': return levelLabel || 'Level'
    case 'clubs': return 'Calendar'
    case 'resources': return 'Resources'
    case 'login': return 'Sign in'
    case 'settings': return 'Settings'
    case 'intern': return 'Dashboard'
    case 'classes': return 'Classes'
    case 'team': return 'Team'
    case 'rooms': return 'Rooms'
    case 'absences': return 'Absences'
    case 'library': return 'Library'
    case 'reports': return 'Reports'
    case 'intern-clubs': return 'Clubs'
    case 'intern-events': return 'Events'
    case 'intern-volunteers': return 'Volunteers'
    default: return 'ASO Companion'
  }
}

/* the sidebar body shared by desktop aside + mobile drawer */
function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const groups = useNavGroups()
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const setPubView = useStore((s) => s.setPubView)
  const logout = useStore((s) => s.logout)
  const state = useStore((s) => s.state)

  const handleNav = (v: View) => {
    setView(v)
    onNavigate?.()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-3.5">
        <Logo size={30} />
        <div className="leading-tight">
          <div className="font-display text-[16px] font-extrabold tracking-tight">ASO Companion</div>
          <div className="text-[11px] text-muted-foreground">{state.settings.institute}</div>
        </div>
      </div>

      {/* min-h-0 is what lets this shrink inside the flex column so the
          menu actually scrolls on short screens */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-thin px-2">
        <nav aria-label="Admin" className="flex flex-col gap-4 py-2">
          {groups.map((g) => (
            <div key={g.label} role="group" aria-label={g.label}>
              <div aria-hidden className="px-2 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                {g.label}
              </div>
              <div className="flex flex-col gap-0.5">
                {g.items.map((it) => {
                  const Icon = it.icon
                  const active = view === it.view || (it.view === 'eltaso' && view === 'level-detail')
                  return (
                    <button
                      key={it.label}
                      onClick={() => handleNav(it.view)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-full px-2.5 py-2 text-left text-[13.5px] font-semibold transition',
                        active
                          ? 'aso-nav-pill'
                          : 'text-foreground/80 hover:bg-secondary',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="truncate">{it.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-border p-2">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => {
              setPubView(true)
              setView('landing')
              onNavigate?.()
            }}
            className="flex items-center gap-2.5 rounded-full px-2.5 py-2 text-left text-[13.5px] font-semibold text-foreground/80 hover:bg-secondary"
          >
            <Eye className="h-4 w-4" /> Public view
          </button>
          <button
            onClick={() => {
              setView('settings')
              onNavigate?.()
            }}
            className={cn(
              'flex items-center gap-2.5 rounded-full px-2.5 py-2 text-left text-[13.5px] font-semibold transition',
              view === 'settings' ? 'aso-nav-pill' : 'text-foreground/80 hover:bg-secondary',
            )}
          >
            <Settings className="h-4 w-4" /> Settings
          </button>
          <button
            onClick={() => {
              logout()
              onNavigate?.()
            }}
            className="flex items-center gap-2.5 rounded-full px-2.5 py-2 text-left text-[13.5px] font-semibold text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

interface AdminChromeProps {
  mobileNavOpen: boolean
  setMobileNavOpen: (v: boolean) => void
}

export function AdminSidebar({ mobileNavOpen, setMobileNavOpen }: AdminChromeProps) {
  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar md:block">
        <div className="sticky top-0 h-screen">
          <SidebarBody />
        </div>
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu" onKeyDown={(e) => e.key === 'Escape' && setMobileNavOpen(false)}>
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85%] bg-sidebar shadow-2xl aso-fade-up">
            <SidebarBody onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}

export function AdminTopbar({ setMobileNavOpen }: { setMobileNavOpen: (v: boolean) => void }) {
  const view = useStore((s) => s.view)
  const state = useStore((s) => s.state)
  const selectedLevelKey = useStore((s) => s.selectedLevelKey)

  const level = (state.levels || []).find((l) => l.key === selectedLevelKey)
  const title = pageTitle(view, selectedLevelKey, level?.label)

  const st = termStatus(state)
  const total = state.levels.reduce((m, l) => Math.max(m, l.weeks.length), 0)
  let weekChip: string | null
  if (st.mode === 's1' || st.mode === 's2') weekChip = `Week ${st.week} / ${total}`
  else if (st.mode === 'before') weekChip = `Year starts in ${st.daysTo} days`
  else if (st.mode === 'break') weekChip = `Winter break · S2 in ${st.daysTo} days`
  else weekChip = 'Year complete'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open menu"
        aria-haspopup="dialog"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex items-center gap-2">
        <div className="text-[17px] font-extrabold tracking-tight">{title}</div>
        <span className="hidden rounded-full bg-secondary px-2.5 py-1 text-[11.5px] font-bold text-muted-foreground sm:inline">
          {weekChip}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <QuickAdd />
        <ThemeToggle />
      </div>
    </header>
  )
}
