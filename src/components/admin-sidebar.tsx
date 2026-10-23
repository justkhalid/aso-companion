'use client'

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Settings, LogOut, Eye, Menu, Check, Loader2, CloudOff, RotateCcw } from 'lucide-react'
import { Logo } from './logo'
import { ThemeToggle } from './theme-toggle'
import { useStore } from '@/lib/store'
import { termStatus } from '@/lib/app-utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { QuickAdd } from '@/components/admin/quick-add'
import { adminPathFor } from '@/lib/url-sync'
import { NAV_GROUPS, filterNav, isActive, titleFor, type NavItem } from '@/lib/nav/menu'
import { NavRow, FooterRow } from '@/components/nav/nav-row'
import { useNavBadges } from '@/components/nav/use-nav-badges'

/* The menu itself lives in src/lib/nav/menu.ts as data: ids, labels, icons, which tab of
   the Social media page to open, who may see it, and which badge to show. Nothing here
   defines what the menu contains any more, and the title in the top bar comes from the
   same entry, so the heading and the lit item can never disagree. */

/* the sidebar body shared by desktop aside + mobile drawer */
function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const setPubView = useStore((s) => s.setPubView)
  const logout = useStore((s) => s.logout)
  const state = useStore((s) => s.state)
  const socialTab = useStore((s) => s.socialTab)
  const homeTab = useStore((s) => s.homeTab)
  const openSocial = useStore((s) => s.openSocial)
  const guardedGo = useStore((s) => s.guardedGo)
  const badges = useNavBadges(['posts.toPost'])

  /* the admin shell only renders for an admin, so the session is known here */
  const groups = filterNav(NAV_GROUPS, { roles: ['admin'], pubView: false })
  const current = { view, socialTab, homeTab }

  const handleNav = (item: NavItem) => guardedGo(() => {
    useStore.setState((s) => ({ navTick: s.navTick + 1 }))
    if (item.homeTab) useStore.setState({ homeTab: item.homeTab })
    if (item.socialTab) openSocial(item.socialTab)
    else setView(item.view)
    onNavigate?.()
  })

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
            <div key={g.id} role="group" aria-label={g.label}>
              <div aria-hidden className="px-2 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                {g.label}
              </div>
              <div className="flex flex-col gap-0.5">
                {g.items.map((item) => (
                  <NavRow
                    key={item.id}
                    item={item}
                    active={isActive(item, current)}
                    badge={item.badgeKey ? badges[item.badgeKey] : undefined}
                    onNavigate={handleNav}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-border p-2">
        <div className="flex flex-col gap-0.5">
          <FooterRow
            label="Public view"
            icon={Eye}
            onClick={() => { setPubView(true); setView('landing'); onNavigate?.() }}
          />
          <FooterRow
            label="Settings"
            icon={Settings}
            href={adminPathFor('settings')}
            active={view === 'settings'}
            onClick={() => { setView('settings'); onNavigate?.() }}
          />
          <FooterRow
            label="Sign out"
            icon={LogOut}
            danger
            onClick={() => { logout(); onNavigate?.() }}
          />
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

      {/* Radix Dialog does what the hand-rolled drawer only claimed to do: it traps focus,
          closes on Escape from anywhere, hands focus back to the button that opened it,
          and makes the page behind inert while it is open. */}
      <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 md:hidden" />
          <Dialog.Content
            id="admin-mobile-nav"
            aria-describedby={undefined}
            className="fixed left-0 top-0 z-50 h-full w-72 max-w-[85%] bg-sidebar shadow-2xl aso-fade-up md:hidden"
          >
            <Dialog.Title className="sr-only">Admin menu</Dialog.Title>
            <SidebarBody onNavigate={() => setMobileNavOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

export function AdminTopbar({ mobileNavOpen, setMobileNavOpen }: AdminChromeProps) {
  const view = useStore((s) => s.view)
  const state = useStore((s) => s.state)
  const selectedLevelKey = useStore((s) => s.selectedLevelKey)
  const socialTab = useStore((s) => s.socialTab)
  const homeTab = useStore((s) => s.homeTab)

  const level = (state.levels || []).find((l) => l.key === selectedLevelKey)
  /* the title comes from the menu entry that is lit, so they cannot disagree */
  const title = titleFor({ view, socialTab, homeTab }, level?.label)

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
        aria-expanded={mobileNavOpen}
        aria-controls="admin-mobile-nav"
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
  const setView = useStore((s) => s.setView)
  /* is a newer version of the app available? checked when the admin opens, every 5 minutes, and whenever the window comes back to the front */
  const [behind, setBehind] = React.useState(0)
  const [newVersion, setNewVersion] = React.useState('')
  React.useEffect(() => {
    let on = true
    const check = async () => {
      try {
        let r = await fetch('/api/update/status', { cache: 'no-store' })
        if (r.status === 401 && (await useStore.getState().ensureSession())) r = await fetch('/api/update/status', { cache: 'no-store' })
        if (!r.ok) return
        const j = (await r.json()) as { behind: number | null; changes?: number; latest?: { version?: string } | null }
        if (on) { setBehind(j.changes && j.changes > 0 ? j.changes : 0); setNewVersion(j.latest?.version || '') }
      } catch { /* offline: no badge */ }
    }
    void check()
    const id = setInterval(check, 5 * 60 * 1000)
    const onShow = () => { if (document.visibilityState === 'visible') void check() }
    document.addEventListener('visibilitychange', onShow)
    window.addEventListener('focus', onShow)
    return () => { on = false; clearInterval(id); document.removeEventListener('visibilitychange', onShow); window.removeEventListener('focus', onShow) }
  }, [])
  return (
    <div className="flex items-center gap-2" role="status" aria-live="polite">
      {behind > 0 && (
        <button
          type="button"
          onClick={() => {
            try { sessionStorage.setItem('aso-settings-tab', 'updates') } catch { /* not available */ }
            setView('settings')
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/15"
        >
          <span className="h-2 w-2 rounded-full bg-primary" /> Update available{newVersion ? ` · v${newVersion}` : ''}
        </button>
      )}
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
