'use client'

import { create } from 'zustand'
import type { State, View, Side, Theme } from './types'
import { seedState } from './seed'
import { LS_KEY, ROLE_KEY, ADMIN_SEEN_KEY } from './constants'
import { syncViewUrl } from './url-sync'
import { readLocal, writeLocal } from './local-db'

export type BootStatus = 'idle' | 'loading' | 'loaded' | 'error'

interface Toast {
  id: number
  msg: string
  ok: boolean
}

interface UIStore {
  /* app data */
  state: State
  boot: BootStatus
  bootError: string
  lastSync: string | null
  syncing: boolean

  /* routing / auth */
  view: View
  side: Side
  selectedLevelKey: string
  admin: boolean
  pubView: boolean
  rememberDevice: boolean

  /* toast */
  toasts: Toast[]

  /* actions */
  setView: (v: View) => void
  setSide: (s: Side) => void
  openLevel: (key: string) => void
  login: (code: string, remember: boolean) => Promise<boolean>
  logout: () => void
  refreshSecrets: () => Promise<void>
  setPubView: (v: boolean) => void

  setState: (s: State, opts?: { persist?: boolean }) => void
  patch: (fn: (draft: State) => void) => void
  setSettings: (fn: (s: State['settings']) => void) => void
  persist: () => void

  bootApp: () => Promise<void>
  loadFromCloud: () => Promise<{ ok: boolean; msg: string }>
  /* background = a save the admin did not ask for (boot catch-up, autosave): it never opens the sign-in screen */
  saveToCloud: (opts?: { background?: boolean }) => Promise<{ ok: boolean; msg: string }>

  exportBackup: () => string
  importBackup: (json: string) => { ok: boolean; msg: string }
  resetAll: () => void

  toast: (msg: string, ok?: boolean) => void
  dismissToast: (id: number) => void
}

let toastSeq = 1

function lsGet(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
  } catch {
    return null
  }
}
function lsSet(key: string, val: string) {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, val)
  } catch {
    /* ignore quota errors */
  }
}
function lsDel(key: string) {
  try {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/* Local copy writes go through one queue: the newest JSON wins, writes never
   overlap, and a failure toasts once until a later write succeeds. */
let pendingLocal: string | null = null
let flushing = false
let localFailed = false

async function flushLocal() {
  flushing = true
  while (pendingLocal !== null) {
    const json = pendingLocal
    pendingLocal = null
    try {
      await writeLocal(LS_KEY, json)
      localFailed = false
    } catch {
      if (!localFailed) {
        localFailed = true
        useStore
          .getState()
          .toast('Could not save a copy on this device. Changes may be lost if you close the tab; use Export backup.', false)
      }
    }
  }
  flushing = false
}

function saveLocal(json: string) {
  pendingLocal = json
  if (!flushing) void flushLocal()
}

function deepClone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o))
}

/* merge incoming cloud/local state, preferring the higher _rev */
function pickNewer(a: State, b: State): State {
  const ra = a._rev || 0
  const rb = b._rev || 0
  return rb >= ra ? b : a
}

/* apply the theme to the <html> class */
function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return
  const root = document.documentElement
  const effective =
    theme === 'auto'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme
  if (effective === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

/* autosave: wait for a quiet moment so a burst of edits becomes one save
   (one commit) instead of one request per keystroke or click */
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleAutoSave(run: () => Promise<unknown>) {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null
    void run().catch(() => {})
  }, 2500)
}

export const useStore = create<UIStore>((set, get) => ({
  state: seedState(),
  boot: 'idle',
  bootError: '',
  lastSync: null,
  syncing: false,

  view: 'home',
  side: 'elt',
  selectedLevelKey: '',
  admin: false,
  pubView: false,
  rememberDevice: true,

  toasts: [],

  setView: (v) => {
    set({ view: v })
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0 })
      /* public tabs own their path (/clubs, /eltaso, ...); admin-only views
         normalise the URL back to / instead of advertising a tab path */
      syncViewUrl(v)
    }
  },
  setSide: (s) => set({ side: s }),
  openLevel: (key) => {
    set({ selectedLevelKey: key, view: 'level-detail' })
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  },

  login: async (code, remember) => {
    const typed = code.trim()
    let ok = false
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: typed, remember }),
      })
      if (res.status >= 500) throw new Error('server unavailable')
      ok = res.ok
    } catch {
      /* offline: only a device that signed in before (so it holds the admin
         copy of the settings) may sign in locally. Saves still need the server. */
      const known = lsGet(ADMIN_SEEN_KEY) === '1'
      const local = get().state.settings.adminCode
      ok = known && !!local && typed === String(local)
    }
    if (!ok) return false
    set({ admin: true, pubView: false, rememberDevice: remember, view: 'home', side: 'elt' })
    lsSet(ADMIN_SEEN_KEY, '1')
    if (remember) lsSet(ROLE_KEY, 'admin')
    syncViewUrl('home', 'replace')
    /* the public copy has no access codes: pull the admin copy of the settings */
    void get().refreshSecrets()
    return true
  },
  logout: () => {
    set({ admin: false, pubView: false, view: 'home', side: 'elt' })
    lsDel(ROLE_KEY)
    syncViewUrl('home', 'replace')
    void fetch('/api/logout', { method: 'POST' }).catch(() => {})
  },
  refreshSecrets: async () => {
    try {
      const res = await fetch('/api/state?fresh=1', { cache: 'no-store' })
      if (!res.ok) return
      const cloud = (await res.json()) as State
      const { adminCode, teacherCode } = cloud?.settings || {}
      if (adminCode === undefined && teacherCode === undefined) return
      const draft = deepClone(get().state)
      if (adminCode !== undefined && !draft.settings.adminCode) draft.settings.adminCode = adminCode
      if (teacherCode !== undefined && !draft.settings.teacherCode) draft.settings.teacherCode = teacherCode
      set({ state: draft })
      get().persist()
    } catch {
      /* offline: codes arrive on the next admin load */
    }
  },
  setPubView: (v) => set({ pubView: v }),

  setState: (s, opts) => {
    set({ state: s })
    if (opts?.persist !== false) get().persist()
    applyTheme(s.settings.theme)
  },

  patch: (fn) => {
    const draft = deepClone(get().state)
    fn(draft)
    draft._rev = (draft._rev || 0) + 1
    set({ state: draft })
    get().persist()
    if (draft.settings.ghAutoSave) scheduleAutoSave(() => get().saveToCloud({ background: true }))
  },

  setSettings: (fn) => {
    const draft = deepClone(get().state)
    fn(draft.settings)
    draft._rev = (draft._rev || 0) + 1
    set({ state: draft })
    get().persist()
    applyTheme(draft.settings.theme)
  },

  persist: () => {
    saveLocal(JSON.stringify(get().state))
  },

  bootApp: async () => {
    set({ boot: 'loading', bootError: '' })
    // 1. load local state first (IndexedDB, with localStorage fallback)
    const localRaw = await readLocal(LS_KEY)
    let localState: State | null = null
    if (localRaw) {
      try {
        localState = JSON.parse(localRaw) as State
      } catch {
        localState = null
      }
    }
    const base = localState && localState.v === 1 ? localState : seedState()
    set({ state: base })
    applyTheme(base.settings.theme)
    // restore admin session if remembered
    const role = lsGet(ROLE_KEY)
    /* a remembered admin still lands on the public view: the site's main link
       always opens what visitors see, and the admin menu opens on request */
    if (role === 'admin') set({ admin: true, pubView: true })

    // v4.7: returning visitors (data already in localStorage) render right
    // away and the cloud copy still merges in below. Fresh visitors stay on
    // the boot splash until the cloud copy arrives, so the sample seed data
    // never flashes on the screen.
    if (localState && localState.v === 1) set({ boot: 'loaded' })

    // 2. fetch cloud state and compare _rev
    // v4.6: single data path through /api/state (Vercel Blob primary,
    //        GitHub only as server-side fallback). No direct client-side
    //        GitHub fetches anymore: one source of truth, one route.
    try {
      /* no-cache = revalidate with the ETag: a 304 reuses the copy already downloaded */
      const res = await fetch('/api/state', { cache: 'no-cache' })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const cloud = (await res.json()) as State
      if (!cloud || cloud.v !== 1) throw new Error('bad state version')
      // preserve local token/lastSync
      if (cloud.settings) {
        cloud.settings.ghToken = get().state.settings.ghToken || ''
        cloud.settings.ghLastSync = get().state.settings.ghLastSync || ''
      }
      const current = get().state
      const merged = pickNewer(current, cloud)
      set({ state: merged, lastSync: new Date().toISOString() })
      applyTheme(merged.settings.theme)
      // keep the newer one in the local copy too
      if (merged !== current) {
        saveLocal(JSON.stringify(merged))
      }
      // convergence: if this device was strictly newer (e.g. an edit made
      // while offline), push it up so the cloud copy catches up instead of
      // devices staying diverged forever.
      if (get().admin && merged === current && (current._rev || 0) > (cloud._rev || 0)) {
        void get().saveToCloud({ background: true }).catch(() => {})
      }
      set({ boot: 'loaded' })
    } catch (e) {
      // offline / network error: keep the local/seed state
      set({
        boot: 'loaded',
        bootError: e instanceof Error ? e.message : 'network error',
      })
    }
  },

  loadFromCloud: async () => {
    set({ syncing: true })
    try {
      /* v4.6: single data path through the server-side /api/state route.
         The storage provider (Vercel Blob or legacy GitHub fallback) is
         resolved on the server; the client never talks to GitHub. */
      const res = await fetch('/api/state?fresh=1', { cache: 'no-store' })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const cloud = (await res.json()) as State
      if (!cloud || cloud.v !== 1) throw new Error('bad state version')
      /* preserve local token/lastSync (these never come from the repo) */
      const local = get().state
      if (cloud.settings) {
        cloud.settings.ghToken = local.settings.ghToken || ''
        cloud.settings.ghLastSync = local.settings.ghLastSync || ''
      }
      set({ state: cloud, lastSync: new Date().toISOString() })
      applyTheme(cloud.settings.theme)
      saveLocal(JSON.stringify(cloud))
      set({ syncing: false })
      return { ok: true, msg: 'Loaded from cloud' }
    } catch (e) {
      set({ syncing: false })
      return { ok: false, msg: e instanceof Error ? e.message : 'load failed' }
    }
  },

  saveToCloud: async (opts) => {
    const s = get().state
    /* v4.6: single save path through the server-side /api/sync route.
       The PAT lives in Vercel environment variables, NOT in the browser.
       With Vercel Blob connected this never touches GitHub; without it,
       the server falls back to the legacy GitHub commit mechanism. */
    set({ syncing: true })
    try {
      /* strip the token + lastSync from the saved JSON (security: PAT never
         goes to the repo even if it's in the local state) */
      const saveState = JSON.parse(JSON.stringify(s))
      if (saveState.settings) {
        saveState.settings.ghToken = ''
        saveState.settings.ghLastSync = ''
      }
      const content = JSON.stringify(saveState, null, 2)

      /* v4.6: single save path through the server-side /api/sync route.
         With Vercel Blob connected this never touches GitHub; without it,
         the server falls back to the legacy GitHub commit mechanism. */
      let ok = false
      let msg = ''
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (res.status === 401) {
        /* cookie expired or missing; edits stay in the local copy. Only a signed-in admin
           is sent back to the sign-in screen: a visitor's background save must never
           put the sign-in page in front of them. */
        const wasAdmin = get().admin && !opts?.background
        set(wasAdmin ? { syncing: false, admin: false, pubView: false, view: 'login' } : { syncing: false })
        if (wasAdmin) lsDel(ROLE_KEY)
        else if (get().admin) get().toast('Not saved to the cloud: sign in again from the admin menu.', false)
        return { ok: false, msg: wasAdmin ? 'Session expired. Sign in again to save.' : 'Not signed in, so this save was skipped' }
      }
      const result = await res.json()
      ok = !!result.ok
      msg = result.msg || ''

      if (ok) {
        /* keep _rev as it was saved: bumping it here made this device look newer
           than the cloud on every boot, which re-saved (and re-committed) the
           same state each time the app opened */
        const draft = deepClone(get().state)
        draft.settings.ghLastSync = new Date().toISOString()
        set({ state: draft, lastSync: draft.settings.ghLastSync, syncing: false })
        saveLocal(JSON.stringify(draft))
        return { ok: true, msg: msg || 'Saved to cloud' }
      } else {
        set({ syncing: false })
        return { ok: false, msg: msg || 'save failed' }
      }
    } catch (e) {
      set({ syncing: false })
      return { ok: false, msg: e instanceof Error ? e.message : 'save failed' }
    }
  },

  exportBackup: () => {
    return JSON.stringify(get().state, null, 2)
  },

  importBackup: (json) => {
    try {
      const s = JSON.parse(json) as State
      if (!s || s.v !== 1) return { ok: false, msg: 'Not a valid ASO Companion backup' }
      const draft = s
      draft._rev = (draft._rev || 0) + 1
      set({ state: draft })
      applyTheme(draft.settings.theme)
      saveLocal(JSON.stringify(draft))
      return { ok: true, msg: 'Backup imported' }
    } catch {
      return { ok: false, msg: 'Could not parse the JSON file' }
    }
  },

  resetAll: () => {
    const s = seedState()
    set({ state: s, view: 'home', selectedLevelKey: '' })
    applyTheme(s.settings.theme)
    saveLocal(JSON.stringify(s))
    syncViewUrl('home', 'replace')
  },

  toast: (msg, ok = true) => {
    const id = toastSeq++
    set((st) => ({ toasts: [...st.toasts, { id, msg, ok }] }))
    setTimeout(() => get().dismissToast(id), 2600)
  },
  dismissToast: (id) =>
    set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })),
}))

/* helper hook: the current "effective" view considering pubView */
export function effectiveView(store: UIStore): View {
  if (!store.admin) {
    // public: only home/eltaso/level-detail/clubs/resources/login
    const allowed: View[] = ['home', 'eltaso', 'level-detail', 'clubs', 'resources', 'login']
    return allowed.includes(store.view) ? store.view : 'home'
  }
  if (store.pubView) {
    const allowed: View[] = ['home', 'eltaso', 'level-detail', 'clubs', 'resources']
    return allowed.includes(store.view) ? store.view : 'home'
  }
  return store.view
}

export { applyTheme }
