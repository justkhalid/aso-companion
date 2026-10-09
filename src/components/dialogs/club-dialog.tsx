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
  IconPicker,
  PosterUploader,
  IconPreview,
} from '@/components/forms/form-controls'
import { useStore } from '@/lib/store'
import { uid } from '@/lib/app-utils'
import type { Club } from '@/lib/types'

export function ClubDialog({
  open,
  onOpenChange,
  club,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  club: Club | null
}) {
  const state = useStore((s) => s.state)
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const isNew = !club

  const [name, setName] = React.useState('')
  const [desc, setDesc] = React.useState('')
  const [days, setDays] = React.useState<string[]>([])
  const [time, setTime] = React.useState('')
  const [room, setRoom] = React.useState('')
  const [lead, setLead] = React.useState('')
  const [vol, setVol] = React.useState('')
  const [url, setUrl] = React.useState('')
  const [icon, setIcon] = React.useState<string | undefined>(undefined)
  const [poster, setPoster] = React.useState<string | undefined>(undefined)

  React.useEffect(() => {
    if (!open) return
    setName(club?.name || '')
    setDesc(club?.desc || '')
    setDays(club?.days || [])
    setTime(club?.time || '')
    setRoom(club?.room || '')
    setLead(club?.lead || '')
    setVol((club?.vol || []).join(', '))
    setUrl(club?.url || '')
    setIcon(club?.icon)
    setPoster(club?.poster)
  }, [open, club])

  const save = () => {
    if (!name.trim()) {
      toast('Give the club a name', false)
      return
    }
    const entry: Club = {
      id: club?.id || uid(),
      name: name.trim(),
      desc: desc.trim(),
      days,
      time: time || '14:00-16:00', // fall back to the shown picker defaults
      room: room.trim(),
      lead: lead.trim(),
      vol: vol.split(',').map((s) => s.trim()).filter(Boolean),
      url: url.trim(),
      icon,
      poster,
      placeholder: club?.placeholder,
    }
    patch((draft) => {
      if (isNew) draft.clubs.push(entry)
      else {
        const i = draft.clubs.findIndex((c) => c.id === entry.id)
        if (i >= 0) draft.clubs[i] = entry
      }
    })
    toast(isNew ? 'Club added' : 'Club saved')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto scroll-thin sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? 'New club' : 'Edit club'}</DialogTitle>
          <DialogDescription>
            Sessions appear on the clubs calendar as soon as they have a day and a time.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cl-name">Club name</Label>
            <Input id="cl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Chess club" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cl-desc">Description</Label>
            <Textarea id="cl-desc" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Days</Label>
            <DayPills value={days} onChange={setDays} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Time (24h)</Label>
            <TimeRangeSelect value={time} onChange={setTime} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cl-room">Room</Label>
            <Input id="cl-room" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Main Hall" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cl-lead">Lead</Label>
            <Input id="cl-lead" value={lead} onChange={(e) => setLead(e.target.value)} list="vol-names" placeholder="No lead yet" />
            <datalist id="vol-names">
              {state.volunteers.map((v) => (
                <option key={v.id} value={v.name} />
              ))}
              {state.team.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cl-vol">Volunteers (comma-separated)</Label>
            <Input id="cl-vol" value={vol} onChange={(e) => setVol(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cl-url">Link (optional)</Label>
            <Input id="cl-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
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
          <Button className="rounded-lg" onClick={save}>{isNew ? 'Add club' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
