'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DAY_KEYS } from '@/lib/constants'
import { useStore } from '@/lib/store'
import { uid } from '@/lib/app-utils'
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
      time: time.trim(),
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
            <Select value={recur} onValueChange={(v) => setRecur(v as EventRecur)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">One-off date</SelectItem>
                <SelectItem value="weekly">Weekly (every week)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {recur === 'weekly' ? (
            <div className="flex flex-col gap-1.5">
              <Label>Day of week</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pick a day" /></SelectTrigger>
                <SelectContent>
                  {DAY_KEYS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-date">Date</Label>
              <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-time">Time (24h)</Label>
              <Input id="ev-time" value={time} onChange={(e) => setTime(e.target.value)} placeholder="16:00-18:00" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-place">Place</Label>
              <Input id="ev-place" value={place} onChange={(e) => setPlace(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>{isNew ? 'Add event' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
