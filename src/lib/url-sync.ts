import type { View } from './types'

/* ==========================================================================
   Public tab URLs - each public tab owns its path so links can be shared:
     /            -> main page for the general public (classes, clubs and events on offer)
     /teachers            -> the teachers' home (calendar)
     /teachers/eltaso     -> ELTASO (levels & schemes of work)
     /teachers/resources  -> resources (library in public mode)
     /teachers/rooms      -> free rooms
     /teachers/reports    -> how to report after a session
     /interns             -> clubs & events only, for interns (own minimal page, no other tabs)
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
  if (p === '/teachers/rooms') return 'teacher-rooms'
  return null
}

/**
 * Keep the address bar in step with the view.
 * - mapped view  -> push (or replace) its path, skipped when already there
 * - unmapped view (login, admin-only screens) -> if the URL shows a public
 *   tab path, normalise it back to / with replaceState (no history spam)
 */
export function syncViewUrl(v: View, mode: 'push' | 'replace' = 'push'): void {
  if (typeof window === 'undefined') return
  const target = PATH_FOR_VIEW[v]
  if (target) {
    if (window.location.pathname === target) return
    if (mode === 'replace') window.history.replaceState({}, '', target)
    else window.history.pushState({}, '', target)
    return
  }
  const p = window.location.pathname
  if (p !== '/' && viewFromPath(p)) window.history.replaceState({}, '', '/')
}
