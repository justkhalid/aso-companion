'use client'

import * as React from 'react'
import { Send, Plus, ExternalLink, Sparkles, Clock, MapPin, User, AlertTriangle, CircleDashed } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PosterThumb } from '@/components/poster-thumb'
import { PageHead, EmptyState, Chip } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { ClubDialog } from '@/components/dialogs/club-dialog'
import { RowActions } from '@/components/admin/row-actions'
import { uid, fmtTime } from '@/lib/app-utils'
import type { Club } from '@/lib/types'

export function InternClubsPage() {
  const state = useStore((s) => s.state)
  const patch = useStore((s) => s.patch)
  const openSocial = useStore((s) => s.openSocial)
  const [dialog, setDialog] = React.useState<{ open: boolean; club: Club | null }>({ open: false, club: null })

  const duplicate = (c: Club) => {
    const copy = { ...c, id: uid(), name: c.name + ' copy' }
    patch((d) => { d.clubs.push(copy) })
    setDialog({ open: true, club: copy })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <PageHead
        title="Clubs"
        subtitle={`${state.clubs.length} clubs`}
        right={
          <Button size="sm" onClick={() => setDialog({ open: true, club: null })}>
            <Plus className="h-4 w-4" /> Add club
          </Button>
        }
      />
      {state.clubs.length === 0 ? (
        <EmptyState icon={<Sparkles className="h-5 w-5" />} title="No clubs yet" hint="Add your first club." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {state.clubs.map((c) => (
            <div key={c.id} className="flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <PosterThumb poster={c.poster} alt={`${c.name} poster`} icon={c.icon} kind="club" />
              <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex-1 font-bold">{c.name}</div>
                {c.placeholder && <Chip tone="gold" icon={CircleDashed}>placeholder</Chip>}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> {(c.days || []).join(' / ') || 'no day set'}</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {fmtTime(c.time) || '-'}</span>
                {c.room && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {c.outside ? 'Outside: ' : ''}{c.room}</span>}
              </div>
              <div className="mt-1.5 text-xs">
                {c.lead ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground"><User className="h-3.5 w-3.5" /> Lead: {c.lead}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-[var(--aso-gold)]"><AlertTriangle className="h-3.5 w-3.5" /> Needs a lead</span>
                )}
              </div>
              {(c.vol || []).length > 0 && (
                <div className="mt-1 text-xs text-muted-foreground">Volunteers: {c.vol.join(', ')}</div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {c.url && (
                  <a href={c.url} target="_blank" rel="noopener">
                    <Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5" /> Link</Button>
                  </a>
                )}
                <Button variant="outline" size="sm" onClick={() => openSocial('club', { kind: 'club', id: c.id })}><Send className="h-3.5 w-3.5" /> Poster and post</Button>
                <div className="ml-auto">
                  <RowActions
                    name={c.name}
                    onEdit={() => setDialog({ open: true, club: c })}
                    onDuplicate={() => duplicate(c)}
                    remove={(d) => { d.clubs = d.clubs.filter((x) => x.id !== c.id) }}
                  />
                </div>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <ClubDialog open={dialog.open} onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))} club={dialog.club} />
    </div>
  )
}
