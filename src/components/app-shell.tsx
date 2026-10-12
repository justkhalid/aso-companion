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
import { LandingPage } from './landing-page'
import { DirectorPage } from './pages/director-page'
import { SiteFooter } from './site-footer'
import { AccessGate } from './access-gate'
import { ResourcesPage } from './pages/resources-page'
import { SettingsPage } from './pages/settings-page'
import { ClassesPage } from './pages/classes-page'
import { TeamPage } from './pages/team-page'
import { RoomsPage } from './pages/rooms-page'
import { AbsencesPage } from './pages/absences-page'
import { LibraryPage } from './pages/library-page'
import { ReportsPage } from './pages/reports-page'
import { DashboardPage } from './pages/dashboard-page'
import { InternClubsPage } from './pages/intern-clubs-page'
import { InternEventsPage } from './pages/intern-events-page'
import { viewFromPath, adminViewFromPath, isAdminPath } from '@/lib/url-sync'
import type { View } from '@/lib/types'

export function AppShell({ initialView }: { initialView?: View }) {
  const bootApp = useStore((s) => s.bootApp)
  const boot = useStore((s) => s.boot)
  const admin = useStore((s) => s.admin)
  const pubView = useStore((s) => s.pubView)
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const setPubView = useStore((s) => s.setPubView)
  const viewer = useStore((s) => s.viewer)
  const loginRules = useStore((s) => s.state.settings)
  const [mobileNav, setMobileNav] = React.useState(false)

  // boot the app once on mount (fetches cloud state in the background).
  React.useEffect(() => {
    void bootApp()
  }, [bootApp])

  // deep link: /teachers/eltaso, /teachers/resources land directly on that tab
  // (no-op when the URL is /, the default home). Runs before the boot
  // splash lifts, so the first real paint is already the requested tab.
  React.useEffect(() => {
    if (initialView && !isAdminPath(window.location.pathname)) setView(initialView)
  }, [])

  // browser back / forward walks through public tab paths
  React.useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname
      const st = useStore.getState()
      const v = isAdminPath(path) ? (st.admin ? adminViewFromPath(path) : 'login') : viewFromPath(path)
      if (v) setView(v) // syncViewUrl skips the push when already on the path
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // /admin/...: once the session is known, signed-in admins land on that admin screen and everyone else on the sign-in
  const adminLanded = React.useRef(false)
  React.useEffect(() => {
    if (boot !== 'loaded' || adminLanded.current) return
    adminLanded.current = true
    const path = window.location.pathname
    if (!isAdminPath(path)) return
    const st = useStore.getState()
    if (st.admin) {
      st.setPubView(false)
      setView(adminViewFromPath(path) || 'dashboard')
    } else setView('login')
  }, [boot])

  // v4.7 boot splash: until the app state is ready, show a branded splash
  // instead of rendering anything. This kills the split-second flash of the
  // sample seed timetable on refresh (server HTML + first client paint are
  // both the splash; real content appears once localStorage/cloud is in).
  if (boot !== 'loaded') {
    return <BootSplash />
  }

  const ev: View = computeView(view, admin, pubView)

  /* /calendar: calendar and free rooms on one plain page, no sign-in, nothing to click but the arrows */
  if (ev === 'director') {
    return (
      <>
        <DirectorPage />
        <AppToaster />
      </>
    )
  }

  /* /: the main page for the general public (classes, clubs and events on offer) */
  if (ev === 'landing') {
    return (
      <>
        <LandingPage />
        <AppToaster />
      </>
    )
  }

  /* the teachers' and interns' pages open with their own access code (the admin opens everything) */
  const teacherOk = admin || viewer.teacher || loginRules.teacherLoginRequired !== true
  const internOk = admin || viewer.intern || loginRules.internLoginRequired !== true
  const internView = INTERN_PAGES.includes(ev)
  if (internView && !internOk) {
    return (
      <>
        <AccessGate role="intern" />
        <AppToaster />
      </>
    )
  }
  if (!admin || pubView) {
    if (['home', 'eltaso', 'level-detail', 'resources', 'reports', 'teacher-rooms'].includes(ev) && !teacherOk) {
      return (
        <>
          <AccessGate role="teacher" />
          <AppToaster />
        </>
      )
    }
  }

  /* /interns: clubs and events only, in its own minimal page (no tabs, no admin chrome) */
  if (internView) {
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
                onClick={() => { setPubView(false); setView('dashboard') }}
                className="ml-auto text-xs font-bold text-primary hover:underline"
              >
                Open admin menu
              </button>
            </div>
          </div>
        )}
        <main className="flex-1">
          <div key={ev} className="aso-page"><PageBody view={ev} admin={false} /></div>
        </main>
        <SiteFooter current="teachers" />
        <AppToaster />
      </div>
    )
  }

  // admin chrome
  return (
    <div className="flex min-h-screen bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground">Skip to content</a>
      <AdminSidebar mobileNavOpen={mobileNav} setMobileNavOpen={setMobileNav} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar setMobileNavOpen={setMobileNav} />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          <div key={ev} className="aso-page"><PageBody view={ev} admin /></div>
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

const INTERN_PAGES: View[] = ['intern-public', 'interns-events', 'interns-clubs', 'interns-rooms', 'interns-report']

function computeView(view: View, admin: boolean, pubView: boolean): View {
  const allowedPublic: View[] = ['landing', 'director', 'home', 'eltaso', 'level-detail', 'resources', 'intern-public', 'interns-events', 'interns-clubs', 'interns-rooms', 'interns-report', 'teacher-rooms', 'reports', 'login']
  if (!admin) return allowedPublic.includes(view) ? view : 'home'
  if (pubView) return ['landing', 'director', 'home', 'eltaso', 'level-detail', 'resources', 'intern-public', 'interns-events', 'interns-clubs', 'interns-rooms', 'interns-report', 'teacher-rooms', 'reports'].includes(view) ? view : 'home'
  /* a signed-in admin never sees the sign-in screen or the public main page inside the admin shell */
  return view === 'login' || view === 'landing' ? 'dashboard' : view === 'intern' ? 'dashboard' : view
}

function PageBody({ view, admin }: { view: View; admin: boolean }) {
  switch (view) {
    case 'dashboard':
      return admin ? <DashboardPage /> : <HomePage admin={false} />
    case 'home':
      return <HomePage admin={admin} />
    case 'eltaso':
      return <EltasoPage />
    case 'level-detail':
      return <LevelDetailPage admin={admin} />
    case 'clubs':
      return <ClubsPage admin={admin} section={admin ? 'calendar' : undefined} />
    case 'landing':
      return <HomePage admin={admin} />
    case 'teacher-rooms':
      return <RoomsPage focus={['Room 1', 'Room 2']} only />
    case 'intern-public':
    case 'interns-events':
    case 'interns-clubs':
    case 'interns-rooms':
    case 'interns-report':
      return <ClubsPage admin={false} internMode />
    case 'resources':
      return <ResourcesPage />
    case 'settings':
      return admin ? <SettingsPage /> : <ResourcesPage />
    case 'classes':
      return admin ? <ClassesPage /> : <HomePage admin={false} />
    case 'team':
      return admin ? <TeamPage /> : <HomePage admin={false} />
    case 'rooms':
      return admin ? <RoomsPage /> : <HomePage admin={false} />
    case 'absences':
      return admin ? <AbsencesPage /> : <HomePage admin={false} />
    case 'library':
      return admin ? <LibraryPage /> : <ResourcesPage />
    case 'reports':
      return <ReportsPage />
    case 'intern':
      return admin ? <DashboardPage /> : <HomePage admin={false} />
    case 'intern-clubs':
      return admin ? <InternClubsPage /> : <ClubsPage admin={false} />
    case 'intern-events':
      return admin ? <InternEventsPage /> : <ClubsPage admin={false} />
    case 'login':
      return <LoginPage />
    default:
      return <HomePage admin={admin} />
  }
}

