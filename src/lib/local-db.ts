/*
 * Local copy of the app state. IndexedDB is the primary store (large quota);
 * localStorage is the fallback when IndexedDB is unavailable, and the source
 * of a one-time migration for copies saved by older versions.
 * Small values (ROLE_KEY, theme) stay in localStorage and do not use this.
 */

const DB_NAME = 'aso-companion'
const STORE = 'kv'
const OPEN_TIMEOUT_MS = 3000

let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    const timer = setTimeout(() => resolve(null), OPEN_TIMEOUT_MS)
    const done = (db: IDBDatabase | null) => {
      clearTimeout(timer)
      resolve(db)
    }
    try {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE)
      }
      req.onsuccess = () => done(req.result)
      req.onerror = () => done(null)
      req.onblocked = () => done(null)
    } catch {
      done(null)
    }
  })
  return dbPromise
}

function idbGet(db: IDBDatabase, key: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
    req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : null)
    req.onerror = () => reject(req.error)
  })
}

function idbPut(db: IDBDatabase, key: string, val: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(val, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

function lsGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function lsRemove(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/* Read the local copy. A copy still in localStorage is moved to IndexedDB and
   the old key is removed once the write has succeeded. */
export async function readLocal(key: string): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const db = await openDb()
  if (!db) return lsGet(key)
  try {
    const fromIdb = await idbGet(db, key)
    if (fromIdb !== null) {
      lsRemove(key) // drop a stale copy left by an interrupted migration
      return fromIdb
    }
    const legacy = lsGet(key)
    if (legacy !== null) {
      await idbPut(db, key, legacy)
      lsRemove(key)
    }
    return legacy
  } catch {
    return lsGet(key)
  }
}

/* Write the local copy; rejects when nothing could be stored. */
export async function writeLocal(key: string, val: string): Promise<void> {
  if (typeof window === 'undefined') return
  const db = await openDb()
  if (db) {
    try {
      await idbPut(db, key, val)
      lsRemove(key)
      return
    } catch {
      /* fall through to localStorage */
    }
  }
  window.localStorage.setItem(key, val)
}

/* Remove the local copy from both stores. */
export async function clearLocal(key: string): Promise<void> {
  if (typeof window === 'undefined') return
  lsRemove(key)
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = tx.onerror = tx.onabort = () => resolve()
  })
}

/* Compact JSON size of a value, in characters. */
export function compactSize(value: unknown): number {
  try {
    return JSON.stringify(value).length
  } catch {
    return 0
  }
}
