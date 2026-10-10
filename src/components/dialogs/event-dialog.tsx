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
import {
  DayPills,
  TimeRangeSelect,
  PickOrType,
  IconPicker,
  IconPreview,
  PosterUploader,
} from '@/components/forms/form-controls'
import { useStore } from '@/lib/store'
import { uid, roomOptionsFor } from '@/lib/app-utils'
import type { EventEntry, EventRecur } from '@/lib/types'

const RECUR_OPTIONS: { v: EventRecur; label: string }[] = [
  { v: 'once', label: 'One-off date' },
  { v: 'weekly', label: 'Every week' },
  { v: 'biweekly', label: 'Every 2 weeks' },
  { v: 'monthly', label: 'Once a month' },
]

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
  const [recur, setRecur] = React.useState<EventRecur>('once')
  const [day, setDay] = React.useState('')
  const [date, setDate] = React.useState('')
  const [from, setFrom] = React.useState('')
  const [until, setUntil] = React.useState('')
  const [time, setTime] = React.useState('')
  const [place, setPlace] = React.useState('')
  const [poster, setPoster] = React.useState<string | undefined>(undefined)
  const [icon, setIcon] = React.useState<string | undefined>(undefined)

  React.useEffect(() => {
    if (!open) return
    setTitle(event?.title || '')
    setDesc(event?.desc || '')
    const r = !event?.recur || event.recur === 'none' ? 'once' : event.recur
    setRecur(r)
    setDay(event?.day || '')
    setDate(event?.date || '')
    setFrom(event?.from || '')
    setUntil(event?.until || '')
    setTime(event?.time || '')
    setPlace(event?.place || '')
    setPoster(event?.poster)
    setIcon(event?.icon)
  }, [open, event?.id])

  const roomOptions = React.useMemo(() => roomOptionsFor(state), [state])
  const repeating = recur !== 'none' && recur !== 'once'

  const save = () => {
    if (!title.trim()) {
      toast('Give the event a title', false)
      return
    }
    if (repeating && !day) {
      toast('Pick the day of the week', false)
      return
    }
    if (!repeating && !date) {
      toast('Pick the date of the event', false)
      return
    }
    const entry: EventEntry = {
      id: event?.id || uid(),
      title: title.trim(),
      desc: desc.trim(),
      recur, // 'none' is legacy; new events always save a modern value
      day: repeating ? day : undefined,
      date: repeating ? undefined : date,
      from: repeating && from ? from : undefined,
      until: repeating && until ? until : undefined,
      time: time.trim() || '16:00-18:00', // fall back to the shown picker defaults
      place: place.trim(),
      poster,
      icon,
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
      <DialogContent className="max-h-[92vh] overflow-y-auto scroll-thin sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? 'New event' : 'Edit event'}</DialogTitle>
          <DialogDescription>
            One-off events show with their date. Repeating events choose how often they come back and for how long they run.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-title">Title</Label>
            <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} dir="auto" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-desc">Description</Label>
            <Textarea id="ev-desc" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} dir="auto" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Repeats</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {RECUR_OPTIONS.map((o) => (
                <SegmentedButton key={o.v} active={recur === o.v} onClick={() => setRecur(o.v)}>
                  {o.label}
                </SegmentedButton>
              ))}
            </div>
          </div>

          {repeating ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Day of week</Label>
                <DayPills
                  value={day ? [day] : []}
                  onChange={(ds) => setDay(ds[ds.length - 1] || '')}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ev-from">Runs from (optional)</Label>
                  <Input id="ev-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ev-until">Until (optional)</Label>
                  <Input id="ev-until" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
                </div>
              </div>
            </>
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

          <div className="flex flex-col gap-2">
            <Label>Chip icon</Label>
            <IconPicker value={icon} onChange={setIcon} />
            {icon && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                Shows on the calendar chip: <IconPreview icon={icon} className="text-primary" />
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Poster</Label>
            <PosterUploader value={poster} onChange={setPoster} />
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
