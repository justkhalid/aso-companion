import type { View } from './types'

/* ==========================================================================
   Public tab URLs - each public tab owns its path so links can be shared:
     /            -> home (teachers calendar)
     /eltaso      -> ELTASO (levels & schemes of work)
     /clubs       -> clubs & events
     /resources   -> resources (library in public mode)
   Transient public sub-views (level-detail) keep the parent tab's path, and
   admin-only views never push a path; if the URL currently shows a public
   tab while an admin-only view opens, it is quietly normalised back to /.
   ========================================================================== */

/** path each public tab lives on (level-detail rides on /eltaso) */
const PATH_FOR_VIEW: Partial<Record<View, string>> = {
  home: '/',
  eltaso: '/eltaso',
  'level-detail': '/eltaso',
  clubs: '/clubs',
  resources: '/resources',
}

/** reverse map: which public view a path stands for (never level-detail) */
export function viewFromPath(pathname: string): View | null {
  if (typeof window === 'undefined') return null
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (p === '/') return 'home'
  if (p === '/eltaso') return 'eltaso'
  if (p === '/clubs') return 'clubs'
  if (p === '/resources') return 'resources'
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
