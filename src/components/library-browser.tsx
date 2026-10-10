'use client'

import * as React from 'react'
import { ExternalLink, FileText, Folder, FolderOpen, Pencil, Search, Star, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { LIB_GROUPS, libGroup } from '@/lib/constants'
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

function FolderCard({ l, admin }: { l: LibraryFolder; admin?: AdminActions }) {
  const bands = l.bands && l.bands.length ? l.bands : null
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <FolderOpen className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <a href={l.url} target="_blank" rel="noopener" className="font-bold hover:underline">
          {l.name}
        </a>
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
  )
}

export function LibraryBrowser({ admin }: { admin?: AdminActions }) {
  const state = useStore((s) => s.state)
  const [q, setQ] = React.useState('')
  const [band, setBand] = React.useState<LibBand | ''>('')
  const [skill, setSkill] = React.useState('')
  const query = q.trim().toLowerCase()

  const folders = state.library.filter(
    (l) => matchesFilters(l, band, skill) && (!query || (l.name + ' ' + l.desc).toLowerCase().includes(query)),
  )
  const groups = LIB_GROUPS.map((g) => ({
    g,
    items: folders.filter((l) => libGroup(l).k === g.k).sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((x) => x.items.length > 0)
  const picks = band && !query ? picksFor(state, band) : []

  return (
    <div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search folders, for example: flashcards, KET, songs"
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
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

      {picks.length > 0 && (
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

      {groups.map(({ g, items }) => (
        <div key={g.k} className="mb-6">
          <div className="mb-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">{g.label}</div>
          <div className="mb-2 text-xs text-muted-foreground">{g.hint}</div>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
            {items.map((l) => (
              <FolderCard key={l.id} l={l} admin={admin} />
            ))}
          </div>
        </div>
      ))}
      {groups.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No folders match. Try another word, age or skill.
        </div>
      )}
    </div>
  )
}
