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
import type { View } from '@/lib/types'

export function AppShell() {
  const bootApp = useStore((s) => s.bootApp)
  const admin = useStore((s) => s.admin)
  const pubView = useStore((s) => s.pubView)
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const setPubView = useStore((s) => s.setPubView)
  const [mobileNav, setMobileNav] = React.useState(false)

  // boot the app once on mount (fetches cloud state in the background).
  // The UI renders right away with localStorage/seed data; the cloud
  // state merges in when it arrives.
  React.useEffect(() => {
    void bootApp()
  }, [bootApp])

  const ev: View = computeView(view, admin, pubView)

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
        {pubView && (
          <div className="border-b border-primary/20 bg-primary/5">
            <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
              <span className="text-xs font-semibold text-primary">Public preview</span>
              <button
                onClick={() => setPubView(false)}
                className="ml-auto text-xs font-bold text-primary hover:underline"
              >
                Back to admin
              </button>
            </div>
          </div>
        )}
        <main className="flex-1">
          <PageBody view={ev} admin={false} />
        </main>
        <PublicFooter onAdmin={() => setView('login')} />
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

function computeView(view: View, admin: boolean, pubView: boolean): View {
  const allowedPublic: View[] = ['home', 'eltaso', 'level-detail', 'clubs', 'resources', 'login']
  if (!admin) return allowedPublic.includes(view) ? view : 'home'
  if (pubView) return ['home', 'eltaso', 'level-detail', 'clubs', 'resources'].includes(view) ? view : 'home'
  return view
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
      return admin ? <ReportsPage /> : <ResourcesPage />
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

function PublicFooter({ onAdmin }: { onAdmin: () => void }) {
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
            Admin sign in
          </button>
        </div>
      </div>
    </footer>
  )
}
