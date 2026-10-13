'use client'

import * as React from 'react'
import { ChevronRight, ExternalLink, FileText, Folder, FolderOpen, Pencil, Pin, Search, Star, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { LIB_GROUPS, libGroup } from '@/lib/constants'
import {
  FLAG_DUPLICATE,
  FLAG_UNSCANNED,
  driveFileUrl,
  driveFolderUrl,
  searchIndex,
  skillFolders,
  useLibraryIndex,
  type IndexNode,
  type IndexRoot,
  type LibraryIndex,
} from '@/lib/library-index'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LibBand, LibraryFolder, State } from '@/lib/types'

const SKILL_NAMES: Record<string, string> = { L: 'Listening', S: 'Speaking', R: 'Reading', W: 'Writing' }
const BANDS: LibBand[] = ['Kids', 'Teens', 'Adults']

function matchesFilters(l: LibraryFolder, band: LibBand | '', skill: string) {
  const bandOk = !band || !l.bands || l.bands.length === 0 || l.bands.includes(band)
  return bandOk && (!skill || (l.sk || []).includes(skill))
}

type AdminActions = { onEdit: (l: LibraryFolder) => void; onDelete: (l: LibraryFolder) => void }

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-bold transition',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary/40',
      )}
    >
      {children}
    </button>
  )
}

/* the files the Teacher kits use most for one age band */
function picksFor(state: State, band: LibBand) {
  const by = new Map<string, { label: string; url: string; t: string; n: number }>()
  for (const lv of state.levels) {
    if (lv.band !== band) continue
    for (const w of lv.weeks) {
      const seen = new Set<string>()
      for (const k of w.kit || []) {
        if (seen.has(k.u)) continue
        seen.add(k.u)
        const cur = by.get(k.u)
        if (cur) cur.n++
        else by.set(k.u, { label: k.l, url: k.u, t: k.t, n: 1 })
      }
    }
  }
  return Array.from(by.values())
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
    .slice(0, 12)
}


/* Pinned resources: the admin pins the best folders and files, everyone who opens the library sees them first.
   A pin is stored as "kind|id|name" in the shared state (kind: lib = a Library folder, dir = a Drive subfolder, file = a Drive file). */
type PinKind = 'lib' | 'dir' | 'file'
const pinStart = (kind: PinKind, id: string) => kind + '|' + id + '|'
function parsePin(p: string): { kind: PinKind; id: string; name: string } | null {
  const [kind, id, ...rest] = p.split('|')
  if ((kind !== 'lib' && kind !== 'dir' && kind !== 'file') || !id) return null
  return { kind, id, name: rest.join('|') }
}

function PinButton({ kind, id, name }: { kind: PinKind; id: string; name: string }) {
  const admin = useStore((s) => s.admin)
  const pins = useStore((s) => s.state.libraryPins) || []
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  if (!admin) return null
  const on = pins.some((p) => p.startsWith(pinStart(kind, id)))
  return (
    <button
      type="button"
      title={on ? 'Unpin from the best resources' : 'Pin to the best resources'}
      aria-label={on ? 'Unpin' : 'Pin'}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        patch((d) => {
          const cur = d.libraryPins || []
          d.libraryPins = on ? cur.filter((p) => !p.startsWith(pinStart(kind, id))) : [...cur, pinStart(kind, id) + name.replace(/\|/g, '/')]
        })
        toast(on ? 'Unpinned' : 'Pinned to the best resources', true)
      }}
      className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition', on ? 'bg-[var(--aso-gold-tint)] text-[var(--aso-gold)]' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}
    >
      <Pin className={cn("h-4 w-4", on && "fill-current")} />
    </button>
  )
}

function PinnedList({ state }: { state: State }) {
  const pins = (state.libraryPins || []).map(parsePin).filter((x): x is NonNullable<typeof x> => !!x)
  if (!pins.length) return null
  const rows = pins.map((p) => {
    if (p.kind === 'lib') {
      const l = state.library.find((x) => x.id === p.id)
      return { ...p, name: l?.name || p.name, url: l?.url || '' }
    }
    return { ...p, url: p.kind === 'dir' ? driveFolderUrl(p.id) : driveFileUrl(p.id) }
  }).filter((r) => r.url)
  if (!rows.length) return null
  return (
    <div className="mb-5 rounded-2xl border border-[var(--aso-gold)]/40 bg-[var(--aso-gold-tint)] p-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--aso-gold)]">
        <Pin className="h-3.5 w-3.5 fill-current" /> Best resources
      </div>
      <div className="grid gap-1 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.kind + r.id} className="flex items-center gap-1 rounded-md hover:bg-card">
            <a href={r.url} target="_blank" rel="noopener" className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 py-1 text-[13px] font-semibold text-primary hover:underline">
              {r.kind === 'file' ? <FileText className="h-3.5 w-3.5 shrink-0" /> : <Folder className="h-3.5 w-3.5 shrink-0" />}
              <span className="min-w-0 flex-1 truncate">{r.name}</span>
            </a>
            <PinButton kind={r.kind} id={r.id} name={r.name} />
          </div>
        ))}
      </div>
    </div>
  )
}

function TreeList({ nodes, depth, showAll }: { nodes: IndexNode[]; depth: number; showAll: boolean }) {
  const [open, setOpen] = React.useState<Record<string, boolean>>({})
  const rows = nodes
    .filter((n) => showAll || (!(n[4] & FLAG_DUPLICATE) && (n[2] > 0 || n[4] & FLAG_UNSCANNED)))
    .slice()
    .sort((a, b) => a[0].localeCompare(b[0]))
  if (!rows.length) return <div className="px-2 py-1 text-xs text-muted-foreground">No subfolders.</div>
  return (
    <ul className={cn('space-y-0.5', depth > 0 && 'ml-4 border-l border-border pl-2')}>
      {rows.map((n) => {
        const kids = n[3]
        const isOpen = !!open[n[1]]
        return (
          <li key={n[1]}>
            <div className="flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[13px] hover:bg-secondary">
              {kids.length > 0 ? (
                <button
                  type="button"
                  aria-label={isOpen ? 'Collapse' : 'Expand'}
                  onClick={() => setOpen((s) => ({ ...s, [n[1]]: !s[n[1]] }))}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground"
                >
                  <ChevronRight className={cn('h-3.5 w-3.5 transition', isOpen && 'rotate-90')} />
                </button>
              ) : (
                <span className="h-5 w-5 shrink-0" />
              )}
              <Folder className="h-3.5 w-3.5 shrink-0 text-primary" />
              <a href={driveFolderUrl(n[1])} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate font-semibold hover:underline">
                {n[0]}
              </a>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {n[4] & FLAG_UNSCANNED ? 'not scanned' : n[2] + (n[2] === 1 ? ' file' : ' files')}
              </span>
              <PinButton kind="dir" id={n[1]} name={n[0]} />
            </div>
            {isOpen && kids.length > 0 && <TreeList nodes={kids} depth={depth + 1} showAll={showAll} />}
          </li>
        )
      })}
    </ul>
  )
}

function FolderCard({
  l,
  root,
  indexState,
  showAll,
  onBrowse,
  admin,
}: {
  l: LibraryFolder
  root: IndexRoot | undefined
  indexState: LibraryIndex | null | undefined
  showAll: boolean
  onBrowse: () => void
  admin?: AdminActions
}) {
  const [open, setOpen] = React.useState(false)
  const bands = l.bands && l.bands.length ? l.bands : null
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FolderOpen className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <a href={l.url} target="_blank" rel="noopener" className="font-bold hover:underline">
              {l.name}
            </a>
            {root && <span className="text-[11px] font-semibold text-muted-foreground">{root.files} {root.files === 1 ? 'file' : 'files'}</span>}
          </div>
          <div className="text-sm text-muted-foreground">{l.desc}</div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {bands ? (
              bands.map((b) => (
                <span key={b} className="inline-flex rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-extrabold text-primary">
                  {b}
                </span>
              ))
            ) : (
              <span className="inline-flex rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-extrabold text-muted-foreground">All ages</span>
            )}
            {(l.sk || []).map((k) => (
              <span key={k} className={cn('sk-' + k, 'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-extrabold')}>
                {k} · {SKILL_NAMES[k]}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <a href={l.url} target="_blank" rel="noopener" className="text-muted-foreground hover:text-foreground" title="Open in Drive">
            <ExternalLink className="h-4 w-4" />
          </a>
          <PinButton kind="lib" id={l.id} name={l.name} />
          {admin && (
            <>
              <Button variant="ghost" size="icon" onClick={() => admin.onEdit(l)} title="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => admin.onDelete(l)} title="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o)
          onBrowse()
        }}
        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
      >
        <ChevronRight className={cn('h-3.5 w-3.5 transition', open && 'rotate-90')} />
        {open ? 'Hide subfolders' : 'Browse subfolders'}
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-border bg-background p-2">
          {indexState === undefined && <div className="px-2 py-1 text-xs text-muted-foreground">Loading...</div>}
          {indexState === null && <div className="px-2 py-1 text-xs text-muted-foreground">The folder index is not available. Open the folder in Drive instead.</div>}
          {indexState && !root && <div className="px-2 py-1 text-xs text-muted-foreground">This folder is not in the index yet. Open it in Drive.</div>}
          {indexState && root && <TreeList nodes={root.tree} depth={0} showAll={showAll} />}
        </div>
      )}
    </div>
  )
}

export function LibraryBrowser({ admin }: { admin?: AdminActions }) {
  const state = useStore((s) => s.state)
  const [q, setQ] = React.useState('')
  const [band, setBand] = React.useState<LibBand | ''>('')
  const [skill, setSkill] = React.useState('')
  const [showAll, setShowAll] = React.useState(false)
  const [wantIndex, setWantIndex] = React.useState(false)
  const query = q.trim()
  const index = useLibraryIndex(wantIndex || query.length >= 2 || skill !== '')

  const rootById = React.useMemo(() => {
    const m = new Map<string, IndexRoot>()
    index?.roots.forEach((r) => m.set(r.id, r))
    return m
  }, [index])

  const folders = React.useMemo(
    () => state.library.filter((l) => matchesFilters(l, band, skill)),
    [state.library, band, skill],
  )

  const groups = LIB_GROUPS.map((g) => ({
    g,
    items: folders.filter((l) => libGroup(l).k === g.k).sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((x) => x.items.length > 0)

  const allowedRoots = React.useMemo(() => (band || skill ? new Set(folders.map((l) => l.id)) : null), [band, skill, folders])

  const result = React.useMemo(() => {
    if (!index || query.length < 2) return null
    return searchIndex(index, query, { showAll, allowedRoots })
  }, [index, query, showAll, allowedRoots])

  const skillPicks = React.useMemo(() => {
    if (!index || !skill) return []
    return skillFolders(index, skill, { showAll, allowedRoots })
  }, [index, skill, showAll, allowedRoots])

  const folderMatches = query.length >= 2
    ? folders.filter((l) => (l.name + ' ' + l.desc).toLowerCase().includes(query.toLowerCase()))
    : []
  const picks = band ? picksFor(state, band) : []

  return (
    <div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search folders and files, for example: present continuous, family flashcards, KET"
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Pill active={band === ''} onClick={() => setBand('')}>All ages</Pill>
        {BANDS.map((b) => (
          <Pill key={b} active={band === b} onClick={() => setBand(b)}>{b}</Pill>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        <Pill active={skill === ''} onClick={() => setSkill('')}>All skills</Pill>
        {Object.keys(SKILL_NAMES).map((k) => (
          <Pill key={k} active={skill === k} onClick={() => setSkill(k)}>{k} · {SKILL_NAMES[k]}</Pill>
        ))}
      </div>
      <label className="mb-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
        Show everything (empty and duplicate folders, Flash games that no longer run)
      </label>

      {!query && <PinnedList state={state} />}

      {picks.length > 0 && !query && (
        <div className="mb-5 rounded-2xl border border-[var(--aso-gold)]/40 bg-[var(--aso-gold-tint)] p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--aso-gold)]">
            <Star className="h-3.5 w-3.5" /> Most used for {band} lessons
          </div>
          <div className="grid gap-1 sm:grid-cols-2">
            {picks.map((p) => (
              <a key={p.url} href={p.url} target="_blank" rel="noopener" className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] font-semibold text-primary hover:bg-card hover:underline">
                {p.t === 'folder' ? <Folder className="h-3.5 w-3.5 shrink-0" /> : <FileText className="h-3.5 w-3.5 shrink-0" />}
                <span className="min-w-0 flex-1 truncate">{p.label}</span>
                <span className="shrink-0 text-[11px] font-medium text-muted-foreground">{p.n} {p.n === 1 ? 'week' : 'weeks'}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {skill && !query && (
        <div className="mb-5 rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Best places for {SKILL_NAMES[skill].toLowerCase()} practice{band ? ' · ' + band : ''}
          </div>
          {index === undefined && <div className="text-sm text-muted-foreground">Looking through the subfolders...</div>}
          {index === null && <div className="text-sm text-muted-foreground">The subfolder list is not available right now. The folders below are tagged for this skill.</div>}
          {index && skillPicks.length === 0 && <div className="text-sm text-muted-foreground">No subfolders found for this skill and age. The folders below are tagged for it.</div>}
          {skillPicks.length > 0 && (
            <div className="grid gap-1 sm:grid-cols-2">
              {skillPicks.map((f) => (
                <div key={f.id} className="flex items-center gap-1 rounded-md hover:bg-secondary">
                  <a href={driveFolderUrl(f.id)} target="_blank" rel="noopener" className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 py-1 text-[13px] font-semibold text-primary hover:underline">
                    <Folder className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{f.name}</span>
                      <span className="block truncate text-[11px] font-medium text-muted-foreground">{[f.rootName, f.path].filter(Boolean).join(' > ')}</span>
                    </span>
                    <span className="shrink-0 text-[11px] font-medium text-muted-foreground">{f.count} {f.count === 1 ? 'file' : 'files'}</span>
                  </a>
                  <PinButton kind="dir" id={f.id} name={f.name} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {query.length >= 2 ? (
        <div className="space-y-4">
          {folderMatches.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Library folders</div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
                {folderMatches.map((l) => (
                  <div key={l.id} className="flex items-center gap-1 rounded-xl border border-border bg-card pr-2 hover:border-primary/40">
                    <a href={l.url} target="_blank" rel="noopener" className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-sm">
                      <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
                      <span className="font-bold">{l.name}</span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{l.desc}</span>
                    </a>
                    <PinButton kind="lib" id={l.id} name={l.name} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {index === undefined && <div className="text-sm text-muted-foreground">Searching...</div>}
          {index === null && <div className="text-sm text-muted-foreground">File search is not available right now. The folder list still works.</div>}
          {result && result.folders.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Subfolders</div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
                {result.folders.map((f) => (
                  <div key={f.id} className="flex items-center gap-1 rounded-xl border border-border bg-card pr-2 hover:border-primary/40">
                    <a href={driveFolderUrl(f.id)} target="_blank" rel="noopener" className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-sm">
                      <Folder className="h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{f.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{[f.rootName, f.path].filter(Boolean).join(' > ')}</div>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{f.count} {f.count === 1 ? 'file' : 'files'}</span>
                    </a>
                    <PinButton kind="dir" id={f.id} name={f.name} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {result && result.files.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Files</div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
                {result.files.map((f) => (
                  <div key={f.rootId + f.id} className="flex items-center gap-1 rounded-xl border border-border bg-card pr-2 hover:border-primary/40">
                    <a href={driveFileUrl(f.id)} target="_blank" rel="noopener" className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-sm">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{f.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{[f.rootName, f.path].filter(Boolean).join(' > ')}</div>
                      </div>
                      {f.copies > 1 && <span className="shrink-0 text-[11px] text-muted-foreground">+{f.copies - 1} copies</span>}
                    </a>
                    <PinButton kind="file" id={f.id} name={f.name} />
                  </div>
                ))}
              </div>
              {result.moreFiles && <div className="mt-1.5 text-xs text-muted-foreground">Showing the first {result.files.length} files. Add a word to narrow the search.</div>}
            </div>
          )}
          {result && result.files.length === 0 && result.folders.length === 0 && folderMatches.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Nothing found. Try fewer or different words.</div>
          )}
        </div>
      ) : (
        <>
          {groups.map(({ g, items }) => (
            <div key={g.k} className="mb-6">
              <div className="mb-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">{g.label}</div>
              <div className="mb-2 text-xs text-muted-foreground">{g.hint}</div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
                {items.map((l) => (
                  <FolderCard
                    key={l.id}
                    l={l}
                    root={rootById.get(l.id)}
                    indexState={index}
                    showAll={showAll}
                    onBrowse={() => setWantIndex(true)}
                    admin={admin}
                  />
                ))}
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No folders for this filter yet. Pick another age or skill.
            </div>
          )}
        </>
      )}
    </div>
  )
}
