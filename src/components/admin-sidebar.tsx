'use client'

import * as React from 'react'
import {
  LayoutDashboard,
  CalendarRange,
  CalendarClock,
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
  Check,
  Loader2,
  CloudOff,
  RotateCcw,
  Share2,
  BookUser,
  Send,
  Plus,
  Clock,
  ClipboardList,
  ClipboardCheck,
  Boxes,
} from 'lucide-react'
import { Logo } from './logo'
import { ThemeToggle } from './theme-toggle'
import { useStore } from '@/lib/store'
import type { View } from '@/lib/types'
import { termStatus } from '@/lib/app-utils'
import { postQueue } from '@/lib/post-queue'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { QuickAdd } from '@/components/admin/quick-add'

interface NavItem {
  label: string
  view: View
  icon: React.ElementType
  tab?: 'todo' | 'club' | 'event' | 'post' | 'month' | 'scheduled' | 'connection' // opens the Posts page on this tab
  tabs?: string[] // all the tabs that keep this item lit
  badge?: number
}
interface NavGroup {
  label: string
  items: NavItem[]
}

function useNavGroups(): NavGroup[] {
  const state = useStore((s) => s.state)
  const toPost = React.useMemo(() => postQueue(state).length, [state])
  return [
    {
      label: 'Overview',
      items: [{ label: 'Dashboard', view: 'dashboard', icon: LayoutDashboard }],
    },
    {
      label: 'Clubs and events',
      items: [
        { label: 'Calendar', view: 'clubs', icon: CalendarDays },
        { label: 'Clubs', view: 'intern-clubs', icon: Sparkles },
        { label: 'Events', view: 'intern-events', icon: CalendarClock },
      ],
    },
    {
      label: 'Posts',
      items: [
        { label: 'To post', view: 'social', icon: Send, tab: 'todo', badge: toPost },
        { label: 'Posters and kits', view: 'social', icon: Share2, tab: 'club', tabs: ['club', 'event'] },
        { label: 'New post', view: 'social', icon: Plus, tab: 'post' },
        { label: 'Month calendar', view: 'social', icon: CalendarDays, tab: 'month' },
        { label: 'Scheduled', view: 'social', icon: Clock, tab: 'scheduled' },
      ],
    },
    {
      label: 'Classes',
      items: [
        { label: 'Classes', view: 'classes', icon: Users },
        { label: 'Week schedule', view: 'home', icon: CalendarRange },
        { label: 'Levels and plans', view: 'eltaso', icon: GraduationCap },
        { label: 'Teaching resources', view: 'library', icon: FolderOpen },
      ],
    },
    {
      label: 'Reports',
      items: [
        { label: 'Monthly report', view: 'month-report', icon: ClipboardList },
        { label: 'Submissions', view: 'submissions', icon: ClipboardCheck },
        { label: 'Reporting guide', view: 'reports', icon: FileText },
      ],
    },
    {
      label: 'ASO Library',
      items: [
        { label: 'Members', view: 'members', icon: BookUser },
        { label: 'Inventory', view: 'inventory', icon: Boxes },
      ],
    },
    {
      label: 'Shared',
      items: [
        { label: 'People', view: 'team', icon: Users },
        { label: 'Rooms', view: 'rooms', icon: DoorOpen },
        { label: 'Absences', view: 'absences', icon: UserX },
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
    case 'team': return 'People'
    case 'rooms': return 'Rooms'
    case 'absences': return 'Absences'
    case 'library': return 'Teaching resources'
    case 'members': return 'Members'
    case 'inventory': return 'Inventory'
    case 'submissions': return 'Report submissions'
    case 'reports': return 'Reporting guide'
    case 'month-report': return 'Monthly report'
    case 'intern-clubs': return 'Clubs'
    case 'intern-events': return 'Events'
    case 'social': return 'Posts'
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

  const socialTab = useStore((s) => s.socialTab)
  const openSocial = useStore((s) => s.openSocial)
  const handleNav = (it: NavItem) => {
    if (it.tab) openSocial(it.tab)
    else setView(it.view)
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
                  const active = it.tab ? view === 'social' && (it.tabs || [it.tab]).includes(socialTab) : view === it.view || (it.view === 'eltaso' && view === 'level-detail')
                  return (
                    <button
                      key={it.label}
                      onClick={() => handleNav(it)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-full px-2.5 py-2 text-left text-[13.5px] font-semibold transition',
                        active
                          ? 'aso-nav-pill'
                          : 'text-foreground/80 hover:bg-secondary',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{it.label}</span>
                      {!!it.badge && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10.5px] font-extrabold leading-none text-primary-foreground">{it.badge}</span>}
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
        <SaveStatus />
        <QuickAdd />
        <ThemeToggle />
      </div>
    </header>
  )
}

/* is everything the admin changed saved? green tick, spinner, amber "unsaved", or a red retry button */
function SaveStatus() {
  const status = useStore((s) => s.saveStatus)
  const error = useStore((s) => s.saveError)
  const unsavedCopy = useStore((s) => s.unsavedCopy)
  const saveToCloud = useStore((s) => s.saveToCloud)
  const restoreUnsaved = useStore((s) => s.restoreUnsaved)
  const dismissUnsaved = useStore((s) => s.dismissUnsaved)
  const toast = useStore((s) => s.toast)
  return (
    <div className="flex items-center gap-2" role="status" aria-live="polite">
      {unsavedCopy && (
        <span className="hidden items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 py-0.5 pl-3 pr-1 text-xs font-bold text-amber-700 dark:text-amber-300 sm:inline-flex">
          Unsaved changes from {new Date(unsavedCopy.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} were found
          <button
            type="button"
            onClick={async () => {
              const r = await restoreUnsaved()
              toast(r.msg, r.ok)
            }}
            className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-white hover:bg-amber-600"
          >
            <RotateCcw className="h-3 w-3" /> Restore
          </button>
          <button type="button" onClick={dismissUnsaved} className="rounded-full px-2 py-1 hover:bg-amber-500/20">Dismiss</button>
        </span>
      )}
      {status === 'saved' && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Check className="h-3.5 w-3.5 text-emerald-600" /> Saved</span>
      )}
      {status === 'saving' && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving</span>
      )}
      {status === 'unsaved' && (
        <button type="button" onClick={() => void saveToCloud()} className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Unsaved · Save now
        </button>
      )}
      {status === 'error' && (
        <button type="button" title={error} onClick={() => void saveToCloud()} className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-700 dark:text-red-300">
          <CloudOff className="h-3.5 w-3.5" /> Not saved · Retry
        </button>
      )}
    </div>
  )
}
