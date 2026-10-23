'use client'

import * as React from 'react'
import { Plus, ExternalLink, Sparkles, Clock, MapPin, CircleDashed } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHead, EmptyState, Chip } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { ClubDialog } from '@/components/dialogs/club-dialog'
import { SessionCard, ArchiveGroup } from '@/components/session-card'
import { isClubOver } from '@/lib/archive'
import { uid, fmtTime, isoOf } from '@/lib/app-utils'
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

  /* a club whose series has an end date in the past is archived; everything else is current */
  const current = state.clubs.filter((c) => !isClubOver(c))
  const ended = state.clubs.filter((c) => isClubOver(c))

  const card = (c: Club, archived: boolean) => (
    <SessionCard
      key={c.id}
      kind="club"
      title={c.name}
      poster={c.poster}
      icon={c.icon}
      archived={archived}
      badge={c.placeholder ? <Chip tone="gold" icon={CircleDashed}>placeholder</Chip> : undefined}
      desc={c.desc}
      meta={[
        { icon: Sparkles, text: (c.days || []).join(' / ') || 'No day set' },
        { icon: Clock, text: fmtTime(c.time) || '-' },
        ...(c.room ? [{ icon: MapPin, text: (c.outside ? 'Outside: ' : '') + c.room }] : []),
      ]}
      lead={c.lead}
      onPost={() => openSocial('club', { kind: 'club', id: c.id })}
      onEdit={() => setDialog({ open: true, club: c })}
      onDuplicate={() => duplicate(c)}
      remove={(d) => { d.clubs = d.clubs.filter((x) => x.id !== c.id) }}
      extraMenu={c.url ? <DropdownMenuItem asChild><a href={c.url} target="_blank" rel="noopener"><ExternalLink className="h-4 w-4" /> Open link</a></DropdownMenuItem> : undefined}
    />
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <PageHead
        title="Clubs"
        subtitle={`${current.length} clubs${ended.length ? ` · ${ended.length} in the archive` : ''}`}
        right={
          <Button size="sm" onClick={() => setDialog({ open: true, club: null })}>
            <Plus className="h-4 w-4" /> Add club
          </Button>
        }
      />
      {state.clubs.length === 0 ? (
        <EmptyState icon={<Sparkles className="h-5 w-5" />} title="No clubs yet" hint="Add your first club." />
      ) : (
        <>
          <div className="grid gap-3">{current.map((c) => card(c, false))}</div>
          <ArchiveGroup count={ended.length}>{ended.map((c) => card(c, true))}</ArchiveGroup>
        </>
      )}
      <ClubDialog open={dialog.open} onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))} club={dialog.club} />
    </div>
  )
}
