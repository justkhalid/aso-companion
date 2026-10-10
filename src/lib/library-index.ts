'use client'

import * as React from 'react'

/* Compact snapshot of the Drive folders listed in the Library, built by
   scripts/build_library_index.py and served from /library-index.json. It powers
   folder browsing and file search; the Drive itself stays untouched. */

/* [name, Drive folder id, files inside (recursive), children, flags]
   flags: 1 = folder not scanned (deeper than the crawl), 2 = near-duplicate sibling */
export type IndexNode = [string, string, number, IndexNode[], number]

export interface IndexRoot {
  id: string // Library folder id (state.library[].id)
  name: string
  drive: string
  files: number
  tree: IndexNode[]
}

export interface LibraryIndex {
  v: number
  built: string
  paths: string[]
  roots: IndexRoot[]
  /* [root index, path index, file name, Drive file id, copies] */
  files: [number, number, string, string, number][]
}

export const FLAG_UNSCANNED = 1
export const FLAG_DUPLICATE = 2

export const driveFolderUrl = (id: string) => 'https://drive.google.com/drive/folders/' + id
export const driveFileUrl = (id: string) => 'https://drive.google.com/file/d/' + id + '/view'

let pending: Promise<LibraryIndex | null> | null = null

export function loadLibraryIndex(): Promise<LibraryIndex | null> {
  if (!pending) {
    pending = fetch('/library-index.json')
      .then((r) => (r.ok ? (r.json() as Promise<LibraryIndex>) : null))
      .then((j) => (j && j.v === 1 ? j : null))
      .catch(() => null)
  }
  return pending
}

/* undefined = not asked yet, null = failed or missing, object = ready */
export function useLibraryIndex(enabled: boolean): LibraryIndex | null | undefined {
  const [idx, setIdx] = React.useState<LibraryIndex | null | undefined>(undefined)
  React.useEffect(() => {
    if (!enabled || idx !== undefined) return
    let alive = true
    loadLibraryIndex().then((j) => {
      if (alive) setIdx(j)
    })
    return () => {
      alive = false
    }
  }, [enabled, idx])
  return idx
}

const BROKEN_EXT = /\.swf$/i

export const isFlash = (name: string) => BROKEN_EXT.test(name)

export interface FileHit {
  rootId: string
  rootName: string
  path: string
  name: string
  id: string
  copies: number
}

export interface FolderHit {
  rootId: string
  rootName: string
  path: string
  name: string
  id: string
  count: number
}

export interface SearchResult {
  files: FileHit[]
  folders: FolderHit[]
  moreFiles: boolean
}

/* every word of the query must appear in the name (files) or path + name (folders) */
export function searchIndex(
  idx: LibraryIndex,
  query: string,
  opts: { showAll: boolean; allowedRoots: Set<string> | null; fileLimit?: number; folderLimit?: number },
): SearchResult {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const fileLimit = opts.fileLimit ?? 60
  const folderLimit = opts.folderLimit ?? 20
  const out: SearchResult = { files: [], folders: [], moreFiles: false }
  if (!words.length) return out

  const rootOk = (i: number) => !opts.allowedRoots || opts.allowedRoots.has(idx.roots[i].id)

  const phrase = words.join(' ')
  const score = (name: string, depthHint: number) => {
    const n = name.toLowerCase()
    const hits = words.filter((w) => n.indexOf(w) > -1).length
    return (n.indexOf(phrase) > -1 ? 100 : 0) + hits * 10 - depthHint
  }

  const folderHits: { s: number; h: FolderHit }[] = []
  idx.roots.forEach((root, ri) => {
    if (!rootOk(ri)) return
    const walk = (nodes: IndexNode[], trail: string[]) => {
      for (const n of nodes) {
        if (!opts.showAll && (n[4] & FLAG_DUPLICATE || (n[2] === 0 && !(n[4] & FLAG_UNSCANNED)))) continue
        const hay = (trail.join(' ') + ' ' + n[0]).toLowerCase()
        if (words.every((w) => hay.indexOf(w) > -1)) {
          folderHits.push({
            s: score(n[0], trail.length),
            h: { rootId: root.id, rootName: root.name, path: trail.join(' > '), name: n[0], id: n[1], count: n[2] },
          })
        }
        if (n[3].length) walk(n[3], trail.concat(n[0]))
      }
    }
    walk(root.tree, [])
  })
  folderHits.sort((a, b) => b.s - a.s || b.h.count - a.h.count)
  out.folders = folderHits.slice(0, folderLimit).map((x) => x.h)

  const fileHits: { s: number; h: FileHit }[] = []
  for (const f of idx.files) {
    if (!rootOk(f[0])) continue
    if (!opts.showAll && isFlash(f[2])) continue
    const pathStr = idx.paths[f[1]].toLowerCase()
    const name = f[2].toLowerCase()
    if (words.every((w) => name.indexOf(w) > -1 || pathStr.indexOf(w) > -1)) {
      const r = idx.roots[f[0]]
      fileHits.push({
        s: score(f[2], 0) + (pathStr.indexOf(phrase) > -1 ? 20 : 0) - pathStr.split(' > ').length,
        h: { rootId: r.id, rootName: r.name, path: idx.paths[f[1]], name: f[2], id: f[3], copies: f[4] },
      })
    }
  }
  fileHits.sort((a, b) => b.s - a.s)
  out.files = fileHits.slice(0, fileLimit).map((x) => x.h)
  out.moreFiles = fileHits.length > fileLimit
  return out
}

/* words in a folder name that say what skill its material trains */
const SKILL_WORDS: Record<string, RegExp> = {
  L: /listening|audio|podcast|songs?\b|music|videos?\b|pronunciation|dictation|movies?\b|films?\b/i,
  S: /speaking|conversation|role.?play|discussion|interview|communicative|debate|small talk|dialogue/i,
  R: /reading|comprehension|readers?\b|stories|story|fables|newspaper|articles?/i,
  W: /writing|creative|essay|email|composition|paragraph|punctuation|spelling\b(?! games)/i,
}
/* the plainest names, ranked first */
const CORE_WORDS = /^(listening|speaking|reading|writing|conversation|comprehension|pronunciation|podcasts?|audio)/i
const NOT_SKILL = /game|tracing|silent|alphabet/i

/* subfolders (any depth) whose name says they train the skill. Short plain
   names near the top rank first (Listening, Speaking), then bigger folders,
   and no single library folder fills the list. */
export function skillFolders(
  idx: LibraryIndex,
  skill: string,
  opts: { showAll: boolean; allowedRoots: Set<string> | null; limit?: number },
): FolderHit[] {
  const re = SKILL_WORDS[skill]
  if (!re) return []
  const scored: { s: number; h: FolderHit }[] = []
  idx.roots.forEach((root) => {
    if (opts.allowedRoots && !opts.allowedRoots.has(root.id)) return
    if (/^seasonal$/i.test(root.name)) return // holiday packs are not skill practice
    /* a whole library folder that is named for the skill (Reading tasks, Podcasts...) */
    if (re.test(root.name) && !NOT_SKILL.test(root.name) && root.files > 0) {
      scored.push({
        s: 60 + Math.log(root.files + 1) * 4,
        h: { rootId: root.id, rootName: root.name, path: '', name: root.name, id: root.drive, count: root.files },
      })
    }
    const walk = (nodes: IndexNode[], trail: string[]) => {
      for (const n of nodes) {
        if (!opts.showAll && (n[4] & FLAG_DUPLICATE || (n[2] === 0 && !(n[4] & FLAG_UNSCANNED)))) continue
        if (re.test(n[0]) && !NOT_SKILL.test(n[0]) && n[2] > 0) {
          const plain = (CORE_WORDS.test(n[0].trim()) ? 30 : 0) + (n[0].trim().split(/\s+/).length <= 2 ? 10 : 0)
          scored.push({
            s: plain - trail.length * 8 + Math.log(n[2] + 1) * 4,
            h: { rootId: root.id, rootName: root.name, path: trail.join(' > '), name: n[0], id: n[1], count: n[2] },
          })
        }
        if (n[3].length) walk(n[3], trail.concat(n[0]))
      }
    }
    walk(root.tree, [])
  })
  scored.sort((a, b) => b.s - a.s)
  const perRoot = new Map<string, number>()
  const out: FolderHit[] = []
  for (const x of scored) {
    const c = perRoot.get(x.h.rootId) || 0
    if (c >= 3) continue
    perRoot.set(x.h.rootId, c + 1)
    out.push(x.h)
    if (out.length >= (opts.limit ?? 12)) break
  }
  return out
}
