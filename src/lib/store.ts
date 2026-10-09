'use client'

import { create } from 'zustand'
import type { State, View, Side, Theme } from './types'
import { seedState } from './seed'
import { CLOUD_STATE_URL, LS_KEY, ROLE_KEY } from './constants'

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
  login: (code: string, remember: boolean) => boolean
  logout: () => void
  setPubView: (v: boolean) => void

  setState: (s: State, opts?: { persist?: boolean }) => void
  patch: (fn: (draft: State) => void) => void
  setSettings: (fn: (s: State['settings']) => void) => void
  persist: () => void

  bootApp: () => Promise<void>
  loadFromCloud: () => Promise<{ ok: boolean; msg: string }>
  saveToCloud: () => Promise<{ ok: boolean; msg: string }>

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
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  },
  setSide: (s) => set({ side: s }),
  openLevel: (key) => {
    set({ selectedLevelKey: key, view: 'level-detail' })
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  },

  login: (code, remember) => {
    const ok = String(get().state.settings.adminCode || '1234')
    if (code.trim() !== ok) return false
    set({ admin: true, pubView: false, rememberDevice: remember, view: 'home', side: 'elt' })
    if (remember) lsSet(ROLE_KEY, 'admin')
    return true
  },
  logout: () => {
    set({ admin: false, pubView: false, view: 'home', side: 'elt' })
    lsDel(ROLE_KEY)
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
    if (draft.settings.ghAutoSave) {
      void get().saveToCloud().catch(() => {})
    }
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
    const s = get().state
    try {
      lsSet(LS_KEY, JSON.stringify(s))
    } catch {
      /* ignore */
    }
  },

  bootApp: async () => {
    set({ boot: 'loading', bootError: '' })
    // 1. load local state first (instant)
    const localRaw = lsGet(LS_KEY)
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
    if (role === 'admin') set({ admin: true })

    // 2. fetch cloud state and compare _rev
    // v2.25: try the server-side /api/state proxy first (works on Vercel,
    //        no CORS issues), fall back to direct raw.githubusercontent.com
    //        (works in dev or static export).
    try {
      let res: Response
      try {
        res = await fetch('/api/state', { cache: 'no-store' })
        if (!res.ok) throw new Error('HTTP ' + res.status)
      } catch {
        res = await fetch(CLOUD_STATE_URL, { cache: 'no-store' })
      }
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
      // keep the newer one in localStorage too
      if (merged !== current) {
        try {
          lsSet(LS_KEY, JSON.stringify(merged))
        } catch {
          /* ignore */
        }
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
      /* v2.25: use the server-side /api/state proxy instead of raw.githubusercontent.com directly.
         This works on Vercel (server-side fetch, no CORS issues) and falls back to
         the direct URL if the API route isn't available (e.g. static export). */
      let res: Response
      try {
        res = await fetch('/api/state', { cache: 'no-store' })
        if (!res.ok) throw new Error('HTTP ' + res.status)
      } catch {
        /* fallback to direct fetch (works in dev or static export) */
        res = await fetch(CLOUD_STATE_URL, { cache: 'no-store' })
      }
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
      lsSet(LS_KEY, JSON.stringify(cloud))
      set({ syncing: false })
      return { ok: true, msg: 'Loaded from cloud' }
    } catch (e) {
      set({ syncing: false })
      return { ok: false, msg: e instanceof Error ? e.message : 'load failed' }
    }
  },

  saveToCloud: async () => {
    const s = get().state
    /* v2.25: use the server-side /api/sync proxy. The PAT lives in the
       GITHUB_PAT environment variable on Vercel, NOT in the browser.
       Fallback to client-side direct GitHub API if the server route is
       not available (e.g. static export or dev without env vars). */
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

      /* try the server-side proxy first */
      let ok = false
      let msg = ''
      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })
        const result = await res.json()
        ok = result.ok
        msg = result.msg || ''
      } catch {
        /* fallback: client-side direct GitHub API (for dev or static export) */
        const st = s.settings
        const token = st.ghToken
        const repo = st.ghRepo
        const branch = st.ghBranch || 'main'
        const path = st.ghPath || 'data/state.json'
        if (!token || !repo) {
          set({ syncing: false })
          return { ok: false, msg: 'Set the GitHub repo and token in Settings first (or add GITHUB_PAT env var on Vercel)' }
        }
        const [owner, name] = repo.split('/')
        const metaUrl = `https://api.github.com/repos/${owner}/${name}/contents/${path}?ref=${encodeURIComponent(branch)}`
        const metaRes = await fetch(metaUrl, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
        })
        let sha: string | undefined
        if (metaRes.ok) {
          const meta = await metaRes.json()
          sha = meta.sha
        }
        const encoded = btoa(unescape(encodeURIComponent(content)))
        const putRes = await fetch(
          `https://api.github.com/repos/${owner}/${name}/contents/${path}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: `aso-companion: save state (rev ${s._rev})`,
              branch,
              content: encoded,
              ...(sha ? { sha } : {}),
            }),
          },
        )
        ok = putRes.ok
        msg = ok ? 'Saved to GitHub' : await putRes.text().then((t) => t.slice(0, 200))
      }

      if (ok) {
        const draft = deepClone(get().state)
        draft.settings.ghLastSync = new Date().toISOString()
        draft._rev = (draft._rev || 0) + 1
        set({ state: draft, lastSync: draft.settings.ghLastSync, syncing: false })
        lsSet(LS_KEY, JSON.stringify(draft))
        return { ok: true, msg: msg || 'Saved to GitHub' }
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
      lsSet(LS_KEY, JSON.stringify(draft))
      return { ok: true, msg: 'Backup imported' }
    } catch {
      return { ok: false, msg: 'Could not parse the JSON file' }
    }
  },

  resetAll: () => {
    const s = seedState()
    set({ state: s, view: 'home', selectedLevelKey: '' })
    applyTheme(s.settings.theme)
    lsSet(LS_KEY, JSON.stringify(s))
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
