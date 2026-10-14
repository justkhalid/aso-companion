'use client'

import * as React from 'react'
import { Plus, CalendarDays, Clock, MapPin, Repeat2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { fmtEventWhen, nextOccurrence, fmtD, isOnceEvent, fmtTime } from '@/lib/app-utils'
import { PageHead, EmptyState, Chip } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { EventDialog } from '@/components/dialogs/event-dialog'
import { RowActions } from '@/components/admin/row-actions'
import { uid } from '@/lib/app-utils'
import type { EventEntry } from '@/lib/types'

export function InternEventsPage() {
  const state = useStore((s) => s.state)
  const patch = useStore((s) => s.patch)
  const [dialog, setDialog] = React.useState<{ open: boolean; event: EventEntry | null }>({ open: false, event: null })

  const duplicate = (e: EventEntry) => {
    const copy = { ...e, id: uid(), title: e.title + ' copy' }
    patch((d) => { d.events.push(copy) })
    setDialog({ open: true, event: copy })
  }

  const list = (state.events || [])
    .map((e) => ({ e, d: nextOccurrence(e) }))
    .sort((a, b) => (a.d ? a.d.getTime() : 0) - (b.d ? b.d.getTime() : 0))

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <PageHead
        title="Events"
        subtitle={`${state.events.length} events`}
        right={
          <Button size="sm" onClick={() => setDialog({ open: true, event: null })}>
            <Plus className="h-4 w-4" /> Add event
          </Button>
        }
      />
      {list.length === 0 ? (
        <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="No events yet" hint="Add your first event." />
      ) : (
        <div className="flex flex-col gap-2">
          {list.map(({ e, d }) => (
            <div key={e.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-1.5 flex items-center gap-2">
                <div className="flex-1 font-bold" dir="auto">{e.title}</div>
                <Chip tone={isOnceEvent(e) ? 'primary' : 'gold'} icon={isOnceEvent(e) ? CalendarDays : Repeat2}>{fmtEventWhen(e)}</Chip>
              </div>
              {e.desc && <div className="text-sm text-muted-foreground" dir="auto">{e.desc}</div>}
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">
                {d && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {fmtD(d, { weekday: 'long', day: 'numeric', month: 'long' })}</span>}
                {e.time && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {fmtTime(e.time)}</span>}
                {e.place && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.place}</span>}
              </div>
              <div className="mt-2 flex justify-end">
                <RowActions
                  name={e.title}
                  onEdit={() => setDialog({ open: true, event: e })}
                  onDuplicate={() => duplicate(e)}
                  remove={(d) => { d.events = d.events.filter((x) => x.id !== e.id) }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <EventDialog open={dialog.open} onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))} event={dialog.event} />
    </div>
  )
}
