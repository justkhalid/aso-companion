import type { View } from './types'

/* ==========================================================================
   Public tab URLs - each public tab owns its path so links can be shared:
     /            -> main page for the general public (classes, clubs and events on offer)
     /teachers            -> the teachers' home (calendar)
     /teachers/eltaso     -> ELTASO (levels & schemes of work)
     /teachers/resources  -> resources (library in public mode)
     /teachers/rooms      -> free rooms
     /teachers/reports    -> how to report after a session
     /interns             -> interns' home (weekly calendar)
     /interns/events      -> upcoming events
     /interns/clubs       -> all clubs and what is expected of volunteers
     /interns/rooms       -> free rooms
     /interns/report      -> how to report after a session
     /admin               -> the admin's own site (sign-in when signed out)
     /admin/classes, /admin/team, /admin/rooms, /admin/absences, /admin/library,
     /admin/settings, /admin/clubs, /admin/reports, /admin/eltaso, /admin/resources,
     /admin/interns (+ /clubs /events /volunteers) -> the admin screens
   Old paths (/eltaso, /resources, /clubs) redirect to their new home.
   Transient public sub-views (level-detail) keep the parent tab's path, and
   admin-only views never push a path; if the URL currently shows a public
   tab while an admin-only view opens, it is quietly normalised back to /.
   ========================================================================== */

/** path each public tab lives on (level-detail rides on /eltaso) */
const PATH_FOR_VIEW: Partial<Record<View, string>> = {
  landing: '/',
  home: '/teachers',
  eltaso: '/teachers/eltaso',
  'level-detail': '/teachers/eltaso',
  resources: '/teachers/resources',
  reports: '/teachers/reports',
  'intern-public': '/interns',
  'interns-events': '/interns/events',
  'interns-clubs': '/interns/clubs',
  'interns-rooms': '/interns/rooms',
  'interns-report': '/interns/report',
  'teacher-rooms': '/teachers/rooms',
}

/** reverse map: which public view a path stands for (never level-detail) */
export function viewFromPath(pathname: string): View | null {
  if (typeof window === 'undefined') return null
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (p === '/') return 'landing'
  if (p === '/teachers') return 'home'
  if (p === '/teachers/eltaso') return 'eltaso'
  if (p === '/teachers/resources') return 'resources'
  if (p === '/teachers/reports') return 'reports'
  if (p === '/interns') return 'intern-public'
  if (p === '/interns/events') return 'interns-events'
  if (p === '/interns/clubs') return 'interns-clubs'
  if (p === '/interns/rooms') return 'interns-rooms'
  if (p === '/interns/report') return 'interns-report'
  if (p === '/teachers/rooms') return 'teacher-rooms'
  return null
}

/**
 * Keep the address bar in step with the view.
 * - mapped view  -> push (or replace) its path, skipped when already there
 * - unmapped view (login, admin-only screens) -> if the URL shows a public
 *   tab path, normalise it back to / with replaceState (no history spam)
 */
export function syncViewUrl(v: View, mode: 'push' | 'replace' = 'push', admin = false): void {
  if (typeof window === 'undefined') return
  const target = admin ? ADMIN_PATH[v] || '/admin' : v === 'login' ? '/admin' : PATH_FOR_VIEW[v]
  if (target) {
    if (window.location.pathname === target) return
    if (mode === 'replace') window.history.replaceState({}, '', target)
    else window.history.pushState({}, '', target)
    return
  }
  const p = window.location.pathname
  if (p !== '/' && viewFromPath(p)) window.history.replaceState({}, '', '/')
}

/* the admin's own paths, used while an admin is working inside the admin shell */
const ADMIN_PATH: Partial<Record<View, string>> = {
  home: '/admin',
  classes: '/admin/classes',
  team: '/admin/team',
  rooms: '/admin/rooms',
  absences: '/admin/absences',
  library: '/admin/library',
  settings: '/admin/settings',
  clubs: '/admin/clubs',
  reports: '/admin/reports',
  eltaso: '/admin/eltaso',
  'level-detail': '/admin/eltaso',
  resources: '/admin/resources',
  intern: '/admin/interns',
  'intern-clubs': '/admin/interns/clubs',
  'intern-events': '/admin/interns/events',
  'intern-volunteers': '/admin/interns/volunteers',
  login: '/admin',
}

export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

/** admin view a path stands for ('login' for /admin itself when signed out is decided by the caller) */
export function adminViewFromPath(pathname: string): View | null {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  for (const [v, path] of Object.entries(ADMIN_PATH)) {
    if (path === p && v !== 'level-detail' && v !== 'login') return v as View
  }
  return null
}
