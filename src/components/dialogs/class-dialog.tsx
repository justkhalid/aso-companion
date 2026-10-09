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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DayPills, TimeRangeSelect } from '@/components/forms/form-controls'
import { useStore } from '@/lib/store'
import { uid } from '@/lib/app-utils'
import type { ClassEntry } from '@/lib/types'

export function ClassDialog({
  open,
  onOpenChange,
  cls,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  cls: ClassEntry | null
}) {
  const state = useStore((s) => s.state)
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const isNew = !cls

  const [code, setCode] = React.useState('')
  const [level, setLevel] = React.useState('')
  const [teacher, setTeacher] = React.useState('')
  const [room, setRoom] = React.useState('')
  const [days, setDays] = React.useState<string[]>([])
  const [time, setTime] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setCode(cls?.code || '')
    setLevel(cls?.level || (state.levels[0]?.label || ''))
    setTeacher(cls?.teacher || '')
    setRoom(cls?.room || '')
    setDays(cls?.days || [])
    setTime(cls?.time || '')
  }, [open, cls, state.levels])

  const save = () => {
    if (!code.trim()) {
      toast('Give the class a code', false)
      return
    }
    const timeValue = time.includes('-') ? time : '14:00-16:00' // fall back to the shown picker defaults
    const entry: ClassEntry = {
      id: cls?.id || uid(),
      code: code.trim(),
      level,
      teacher: teacher.trim(),
      room: room.trim(),
      days,
      time: timeValue,
    }
    patch((draft) => {
      if (isNew) draft.classes.push(entry)
      else {
        const i = draft.classes.findIndex((c) => c.id === entry.id)
        if (i >= 0) draft.classes[i] = entry
      }
    })
    toast(isNew ? 'Class added' : 'Class saved')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? 'New class' : 'Edit class'}</DialogTitle>
          <DialogDescription>
            The class shows on the teachers calendar under its level color.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cls-code">Class code</Label>
              <Input
                id="cls-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ASO-K1"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cls-room">Room / space</Label>
              <Input
                id="cls-room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Room 1"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="w-full rounded-lg">
                <SelectValue placeholder="Pick a level" />
              </SelectTrigger>
              <SelectContent className="max-h-64 scroll-thin rounded-lg">
                {state.levels.map((l) => (
                  <SelectItem key={l.key} value={l.label}>
                    {l.label} ({l.cefr})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Days</Label>
            <DayPills value={days} onChange={setDays} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Time slot (24h)</Label>
            <TimeRangeSelect value={time} onChange={setTime} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cls-teacher">Teacher</Label>
            <Input
              id="cls-teacher"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              placeholder="Name"
              list="team-names"
            />
            <datalist id="team-names">
              {state.team.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" className="rounded-lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="rounded-lg" onClick={save}>{isNew ? 'Add class' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
