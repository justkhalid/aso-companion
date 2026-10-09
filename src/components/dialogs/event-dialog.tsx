'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DayPills, TimeRangeSelect, PickOrType } from '@/components/forms/form-controls'
import { useStore } from '@/lib/store'
import { uid, roomOptionsFor } from '@/lib/app-utils'
import type { EventEntry, EventRecur } from '@/lib/types'

export function EventDialog({
  open,
  onOpenChange,
  event,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  event: EventEntry | null
}) {
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const state = useStore((s) => s.state)
  const isNew = !event

  const [title, setTitle] = React.useState('')
  const [desc, setDesc] = React.useState('')
  const [recur, setRecur] = React.useState<EventRecur>('none')
  const [day, setDay] = React.useState('')
  const [date, setDate] = React.useState('')
  const [time, setTime] = React.useState('')
  const [place, setPlace] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setTitle(event?.title || '')
    setDesc(event?.desc || '')
    setRecur(event?.recur || 'none')
    setDay(event?.day || '')
    setDate(event?.date || '')
    setTime(event?.time || '')
    setPlace(event?.place || '')
  }, [open, event])

  const roomOptions = React.useMemo(() => roomOptionsFor(state), [state])

  const save = () => {
    if (!title.trim()) {
      toast('Give the event a title', false)
      return
    }
    const entry: EventEntry = {
      id: event?.id || uid(),
      title: title.trim(),
      desc: desc.trim(),
      recur,
      day: recur === 'weekly' ? day : undefined,
      date: recur === 'none' ? date : undefined,
      time: time.trim() || '16:00-18:00', // fall back to the shown picker defaults
      place: place.trim(),
    }
    patch((draft) => {
      if (isNew) draft.events.push(entry)
      else {
        const i = draft.events.findIndex((e) => e.id === entry.id)
        if (i >= 0) draft.events[i] = entry
      }
    })
    toast(isNew ? 'Event added' : 'Event saved')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? 'New event' : 'Edit event'}</DialogTitle>
          <DialogDescription>
            One-off events show with their date, weekly events repeat every week.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-title">Title</Label>
            <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-desc">Description</Label>
            <Textarea id="ev-desc" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Repeats</Label>
            <div className="grid grid-cols-2 gap-1.5">
              <SegmentedButton
                active={recur === 'none'}
                onClick={() => setRecur('none')}
              >
                One-off date
              </SegmentedButton>
              <SegmentedButton
                active={recur === 'weekly'}
                onClick={() => setRecur('weekly')}
              >
                Weekly
              </SegmentedButton>
            </div>
          </div>

          {recur === 'weekly' ? (
            <div className="flex flex-col gap-1.5">
              <Label>Day of week</Label>
              <DayPills
                value={day ? [day] : []}
                onChange={(ds) => setDay(ds[ds.length - 1] || '')}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-date">Date</Label>
              <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Time (24h)</Label>
            <TimeRangeSelect value={time} onChange={setTime} defaultStart="16:00" defaultEnd="18:00" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-place">Place</Label>
            <PickOrType
              id="ev-place"
              value={place}
              onChange={setPlace}
              options={roomOptions}
              placeholder="Pick a place"
              emptyLabel="No place set"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" className="rounded-lg" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="rounded-lg" onClick={save}>{isNew ? 'Add event' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SegmentedButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all active:scale-[0.98] ${
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-secondary text-muted-foreground hover:bg-secondary/70'
      }`}
    >
      {children}
    </button>
  )
}
