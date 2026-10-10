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
import { DayPills, TimeRangeSelect, PickOrType } from '@/components/forms/form-controls'
import { useStore } from '@/lib/store'
import { uid, suggestClassCode, roomOptionsFor } from '@/lib/app-utils'
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
  const [codeTouched, setCodeTouched] = React.useState(false)
  const [level, setLevel] = React.useState('')
  const [teacher, setTeacher] = React.useState('')
  const [room, setRoom] = React.useState('')
  const [days, setDays] = React.useState<string[]>([])
  const [time, setTime] = React.useState('')

  /* remembers the level the code was loaded with, so the code only
     re-generates when the user actually switches level */
  const prevLevel = React.useRef<string | null>(null)

  /* latest state for the effects below without making them re-run on every
     autosave or cloud refresh (that used to wipe what the user was typing) */
  const stateRef = React.useRef(state)
  React.useEffect(() => {
    stateRef.current = state
  })

  /* load the form once per opening of the dialog (or when another class is picked) */
  React.useEffect(() => {
    if (!open) {
      prevLevel.current = null
      return
    }
    const st = stateRef.current
    const lvl = cls?.level || (st.levels[0]?.label || '')
    setCodeTouched(false)
    prevLevel.current = lvl
    setLevel(lvl)
    setTeacher(cls?.teacher || '')
    setRoom(cls?.room || '')
    setDays(cls?.days || [])
    setTime(cls?.time || '')
    setCode(cls?.code || suggestClassCode(st.classes, lvl))
  }, [open, cls?.id])

  /* new class only: switching level suggests a fresh code until the user types one.
     An existing class keeps its code when the level changes. */
  React.useEffect(() => {
    if (!open || !isNew) return
    if (prevLevel.current === null || prevLevel.current === level) return
    prevLevel.current = level
    if (!codeTouched) setCode(suggestClassCode(stateRef.current.classes, level))
  }, [level, open, isNew, codeTouched])

  const roomOptions = React.useMemo(() => roomOptionsFor(state), [state])
  const teacherNames = React.useMemo(
    () => state.team.map((t) => t.name).filter(Boolean),
    [state.team],
  )

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
                onChange={(e) => {
                  setCodeTouched(true)
                  setCode(e.target.value)
                }}
                placeholder="ASO-K1"
              />
              <span className="text-[11px] leading-tight text-muted-foreground">
                Auto from the level · you can type your own
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cls-room">Room / space</Label>
              <PickOrType
                id="cls-room"
                value={room}
                onChange={setRoom}
                options={roomOptions}
                placeholder="Pick a room"
                emptyLabel="No room yet"
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
            <PickOrType
              id="cls-teacher"
              value={teacher}
              onChange={setTeacher}
              options={teacherNames}
              placeholder="Pick a teacher"
              emptyLabel="No teacher yet"
            />
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
