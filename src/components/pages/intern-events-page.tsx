'use client'

import * as React from 'react'
import { Plus, CalendarDays, Clock, MapPin, Repeat2 } from 'lucide-react'
import { SessionCard, ArchiveGroup } from '@/components/session-card'
import { isEventOver } from '@/lib/archive'
import { useStore } from '@/lib/store'
import { fmtEventWhen, nextOccurrence, fmtD, isOnceEvent, fmtTime, isoOf, parseISO } from '@/lib/app-utils'
import { PageHead, EmptyState, Chip } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { EventDialog } from '@/components/dialogs/event-dialog'
import { uid } from '@/lib/app-utils'
import type { EventEntry } from '@/lib/types'

export function InternEventsPage() {
  const state = useStore((s) => s.state)
  const patch = useStore((s) => s.patch)
  const openSocial = useStore((s) => s.openSocial)
  const [dialog, setDialog] = React.useState<{ open: boolean; event: EventEntry | null }>({ open: false, event: null })

  const duplicate = (e: EventEntry) => {
    const copy = { ...e, id: uid(), title: e.title + ' copy' }
    patch((d) => { d.events.push(copy) })
    setDialog({ open: true, event: copy })
  }

  const isOver = (e: EventEntry) => isEventOver(e)
  const withDate = (state.events || []).map((e) => ({ e, d: nextOccurrence(e) }))
  const upcoming = withDate.filter((x) => !isOver(x.e)).sort((a, b) => (a.d ? a.d.getTime() : Infinity) - (b.d ? b.d.getTime() : Infinity))
  const past = withDate.filter((x) => isOver(x.e)).sort((a, b) => (b.e.date || b.e.until || '').localeCompare(a.e.date || a.e.until || ''))

  const card = ({ e, d }: { e: EventEntry; d: Date | null }, archived: boolean) => (
    <SessionCard
      key={e.id}
      kind="event"
      title={e.title}
      poster={e.poster}
      icon={e.icon}
      desc={e.desc}
      archived={archived}
      badge={<Chip tone={isOnceEvent(e) ? 'primary' : 'gold'} icon={isOnceEvent(e) ? CalendarDays : Repeat2}>{fmtEventWhen(e)}</Chip>}
      meta={[
        ...(d ? [{ icon: CalendarDays, text: fmtD(d, { weekday: 'long', day: 'numeric', month: 'long' }) }] : e.date ? [{ icon: CalendarDays, text: fmtD(parseISO(e.date), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }] : []),
        ...(e.time ? [{ icon: Clock, text: fmtTime(e.time) }] : []),
        ...(e.place ? [{ icon: MapPin, text: (e.outside ? 'Outside: ' : '') + e.place }] : []),
      ]}
      lead={e.lead}
      onPost={() => openSocial('event', { kind: 'event', id: e.id })}
      onEdit={() => setDialog({ open: true, event: e })}
      onDuplicate={() => duplicate(e)}
      remove={(dr) => { dr.events = dr.events.filter((x) => x.id !== e.id) }}
    />
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <PageHead
        title="Events"
        subtitle={`${state.events.length} events`}
        right={
          <Button size="sm" onClick={() => setDialog({ open: true, event: null })}>
            <Plus className="h-4 w-4" /> Add event
          </Button>
        }
      />
      {state.events.length === 0 ? (
        <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="No events yet" hint="Add your first event." />
      ) : (
        <>
          <h2 className="mb-3 text-sm font-extrabold tracking-tight">Upcoming <span className="ml-1 text-xs font-bold text-muted-foreground">{upcoming.length}</span></h2>
          {upcoming.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nothing coming up. Add an event, or look in the archive.</p> : <div className="grid gap-3">{upcoming.map((x) => card(x, false))}</div>}
          <ArchiveGroup count={past.length}>{past.map((x) => card(x, true))}</ArchiveGroup>
        </>
      )}
      <EventDialog open={dialog.open} onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))} event={dialog.event} />
    </div>
  )
}
