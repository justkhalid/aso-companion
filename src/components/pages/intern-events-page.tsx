'use client'

import * as React from 'react'
import { Plus, Pencil, Trash2, CalendarDays, Clock, MapPin } from 'lucide-react'
import { useStore } from '@/lib/store'
import { fmtEventWhen, nextOccurrence, fmtD } from '@/lib/app-utils'
import { PageHead, EmptyState, Chip } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { EventDialog } from '@/components/dialogs/event-dialog'
import type { EventEntry } from '@/lib/types'

export function InternEventsPage() {
  const state = useStore((s) => s.state)
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const [dialog, setDialog] = React.useState<{ open: boolean; event: EventEntry | null }>({ open: false, event: null })

  const remove = (e: EventEntry) => {
    patch((draft) => {
      draft.events = draft.events.filter((x) => x.id !== e.id)
    })
    toast('Event removed')
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
            <div key={e.id} className="rounded-md border border-border bg-card p-4 shadow-sm">
              <div className="mb-1.5 flex items-center gap-2">
                <div className="flex-1 font-bold">{e.title}</div>
                <Chip tone={e.recur === 'weekly' ? 'gold' : 'primary'}>{fmtEventWhen(e)}</Chip>
              </div>
              {e.desc && <div className="text-sm text-muted-foreground">{e.desc}</div>}
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">
                {d && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {fmtD(d, { weekday: 'long', day: 'numeric', month: 'long' })}</span>}
                {e.time && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {e.time}</span>}
                {e.place && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.place}</span>}
              </div>
              <div className="mt-2 flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => setDialog({ open: true, event: e })} title="Edit"><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(e)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <EventDialog open={dialog.open} onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))} event={dialog.event} />
    </div>
  )
}
