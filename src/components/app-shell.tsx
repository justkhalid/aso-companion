'use client'

import * as React from 'react'
import { useStore } from '@/lib/store'
import { PublicNav } from './public-nav'
import { AdminSidebar, AdminTopbar } from './admin-sidebar'
import { AppToaster } from './app-toaster'
import { Logo } from './logo'
import { LoginPage } from './pages/login-page'
import { HomePage } from './pages/home-page'
import { EltasoPage } from './pages/eltaso-page'
import { LevelDetailPage } from './pages/level-detail-page'
import { ClubsPage } from './pages/clubs-page'
import { InternShell } from './intern-shell'
import { ResourcesPage } from './pages/resources-page'
import { SettingsPage } from './pages/settings-page'
import { ClassesPage } from './pages/classes-page'
import { TeamPage } from './pages/team-page'
import { LibraryPage } from './pages/library-page'
import { ReportsPage } from './pages/reports-page'
import { InternOverview } from './pages/intern-overview'
import { InternClubsPage } from './pages/intern-clubs-page'
import { InternEventsPage } from './pages/intern-events-page'
import { InternVolunteersPage } from './pages/intern-volunteers-page'
import { viewFromPath } from '@/lib/url-sync'
import type { View } from '@/lib/types'

export function AppShell({ initialView }: { initialView?: View }) {
  const bootApp = useStore((s) => s.bootApp)
  const boot = useStore((s) => s.boot)
  const admin = useStore((s) => s.admin)
  const pubView = useStore((s) => s.pubView)
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const setPubView = useStore((s) => s.setPubView)
  const [mobileNav, setMobileNav] = React.useState(false)

  // boot the app once on mount (fetches cloud state in the background).
  React.useEffect(() => {
    void bootApp()
  }, [bootApp])

  // deep link: /eltaso, /clubs or /resources land directly on that tab
  // (no-op when the URL is /, the default home). Runs before the boot
  // splash lifts, so the first real paint is already the requested tab.
  React.useEffect(() => {
    if (initialView && initialView !== 'home') setView(initialView)
  }, [])

  // browser back / forward walks through public tab paths
  React.useEffect(() => {
    const onPop = () => {
      const v = viewFromPath(window.location.pathname)
      if (v) setView(v) // syncViewUrl skips the push when already on the path
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // v4.7 boot splash: until the app state is ready, show a branded splash
  // instead of rendering anything. This kills the split-second flash of the
  // sample seed timetable on refresh (server HTML + first client paint are
  // both the splash; real content appears once localStorage/cloud is in).
  if (boot !== 'loaded') {
    return <BootSplash />
  }

  const ev: View = computeView(view, admin, pubView)

  /* /interns: clubs and events only, in its own minimal page (no tabs, no admin chrome) */
  if (ev === 'intern-public') {
    return (
      <>
        <InternShell />
        <AppToaster />
      </>
    )
  }

  // login screen takes over
  if (ev === 'login') {
    return (
      <>
        <LoginPage />
        <AppToaster />
      </>
    )
  }

  // public chrome (not signed in, OR admin in public preview)
  if (!admin || pubView) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <PublicNav />
        {pubView && admin && (
          <div className="border-b border-primary/20 bg-primary/5">
            <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
              <span className="text-xs font-semibold text-primary">Public view · signed in as admin</span>
              <button
                onClick={() => setPubView(false)}
                className="ml-auto text-xs font-bold text-primary hover:underline"
              >
                Open admin menu
              </button>
            </div>
          </div>
        )}
        <main className="flex-1">
          <PageBody view={ev} admin={false} />
        </main>
        <PublicFooter admin={admin} onAdmin={() => (admin ? setPubView(false) : setView('login'))} />
        <AppToaster />
      </div>
    )
  }

  // admin chrome
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar mobileNavOpen={mobileNav} setMobileNavOpen={setMobileNav} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar setMobileNavOpen={setMobileNav} />
        <main className="flex-1">
          <PageBody view={ev} admin />
        </main>
      </div>
      <AppToaster />
    </div>
  )
}

/* Minimal branded boot splash shown while the cloud state loads.
   Prevents the sample seed timetable from flashing on first paint. */
function BootSplash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background">
      <Logo size={44} />
      <div className="flex items-center gap-1.5" aria-label="Loading">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:120ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:240ms]" />
      </div>
    </div>
  )
}

function computeView(view: View, admin: boolean, pubView: boolean): View {
  const allowedPublic: View[] = ['home', 'eltaso', 'level-detail', 'clubs', 'resources', 'intern-public', 'reports', 'login']
  if (!admin) return allowedPublic.includes(view) ? view : 'home'
  if (pubView) return ['home', 'eltaso', 'level-detail', 'clubs', 'resources', 'intern-public', 'reports'].includes(view) ? view : 'home'
  /* a signed-in admin never sees the sign-in screen */
  return view === 'login' ? 'home' : view
}

function PageBody({ view, admin }: { view: View; admin: boolean }) {
  switch (view) {
    case 'home':
      return <HomePage admin={admin} />
    case 'eltaso':
      return <EltasoPage />
    case 'level-detail':
      return <LevelDetailPage admin={admin} />
    case 'clubs':
      return <ClubsPage admin={admin} />
    case 'intern-public':
      return <ClubsPage admin={false} internMode />
    case 'resources':
      return <ResourcesPage />
    case 'settings':
      return admin ? <SettingsPage /> : <ResourcesPage />
    case 'classes':
      return admin ? <ClassesPage /> : <HomePage admin={false} />
    case 'team':
      return admin ? <TeamPage /> : <HomePage admin={false} />
    case 'library':
      return admin ? <LibraryPage /> : <ResourcesPage />
    case 'reports':
      return <ReportsPage />
    case 'intern':
      return admin ? <InternOverview /> : <HomePage admin={false} />
    case 'intern-clubs':
      return admin ? <InternClubsPage /> : <ClubsPage admin={false} />
    case 'intern-events':
      return admin ? <InternEventsPage /> : <ClubsPage admin={false} />
    case 'intern-volunteers':
      return admin ? <InternVolunteersPage /> : <ClubsPage admin={false} />
    case 'login':
      return <LoginPage />
    default:
      return <HomePage admin={admin} />
  }
}

function PublicFooter({ admin, onAdmin }: { admin: boolean; onAdmin: () => void }) {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <Logo size={24} />
          <div className="text-xs text-muted-foreground">
            ASO Companion · American Space Oujda
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{new Date().getFullYear()}</span>
          <button onClick={onAdmin} className="font-bold text-primary hover:underline">
            {admin ? 'Open admin menu' : 'Admin sign in'}
          </button>
        </div>
      </div>
    </footer>
  )
}
