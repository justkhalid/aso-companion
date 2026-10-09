'use client'

import * as React from 'react'
import { Plus, Pencil, Trash2, ExternalLink, FolderOpen } from 'lucide-react'
import { useStore } from '@/lib/store'
import { libCategory, SKILLS } from '@/lib/constants'
import { PageHead, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { LibraryDialog } from '@/components/dialogs/library-dialog'
import { cn } from '@/lib/utils'
import type { LibraryFolder } from '@/lib/types'

const SKILL_NAMES: Record<string, string> = { L: 'Listening', S: 'Speaking', R: 'Reading', W: 'Writing' }

export function LibraryPage() {
  const state = useStore((s) => s.state)
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const [dialog, setDialog] = React.useState<{ open: boolean; folder: LibraryFolder | null }>({ open: false, folder: null })

  const remove = (l: LibraryFolder) => {
    patch((draft) => {
      draft.library = draft.library.filter((x) => x.id !== l.id)
    })
    toast('Removed')
  }

  // group by category preserving order
  const groups: { label: string; folders: LibraryFolder[] }[] = []
  const byCat: Record<string, LibraryFolder[]> = {}
  state.library.forEach((l) => {
    const cat = libCategory(l.name)
    ;(byCat[cat.label] ||= []).push(l)
  })
  const seen = new Set<string>()
  state.library.forEach((l) => {
    const c = libCategory(l.name)
    if (!seen.has(c.label)) {
      seen.add(c.label)
      if (byCat[c.label]) groups.push({ label: c.label, folders: byCat[c.label].slice().sort((a, b) => a.name.localeCompare(b.name)) })
    }
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <PageHead
        title="Library"
        subtitle="Every folder on the Drive, grouped by category and tagged by skill · one tap opens it."
        right={
          <div className="flex gap-2">
            <a href={state.rootUrl || 'https://drive.google.com/'} target="_blank" rel="noopener">
              <Button size="sm" variant="outline"><FolderOpen className="h-3.5 w-3.5" /> Drive root</Button>
            </a>
            <Button size="sm" onClick={() => setDialog({ open: true, folder: null })}>
              <Plus className="h-4 w-4" /> Add folder
            </Button>
          </div>
        }
      />

      {groups.map((g) => (
        <div key={g.label} className="mb-5">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{g.label}</div>
          <div className="grid gap-2">
            {g.folders.map((l) => (
              <div key={l.id} className="flex items-start gap-3 rounded-md border border-border bg-card p-3.5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{l.name}</div>
                  <div className="text-sm text-muted-foreground">{l.desc}</div>
                  {(l.sk || []).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {l.sk.map((k) => (
                        <span key={k} className={cn('sk-' + k, 'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-extrabold')}>
                          {k} · {SKILL_NAMES[k]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a href={l.url} target="_blank" rel="noopener" className="text-muted-foreground hover:text-foreground">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <Button variant="ghost" size="icon" onClick={() => setDialog({ open: true, folder: l })} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(l)} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {state.library.length === 0 && (
        <EmptyState icon={<FolderOpen className="h-5 w-5" />} title="No library folders yet" hint="Add your first Drive folder." />
      )}

      <LibraryDialog open={dialog.open} onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))} folder={dialog.folder} />
    </div>
  )
}
