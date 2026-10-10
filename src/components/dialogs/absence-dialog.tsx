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
import { PickOrType } from '@/components/forms/form-controls'
import { useStore } from '@/lib/store'
import { isoOf, uid } from '@/lib/app-utils'
import { cn } from '@/lib/utils'
import type { Absence } from '@/lib/types'

const REASONS = ['Sick', 'Away', 'Holiday', 'Other']

export function AbsenceDialog({
  open,
  onOpenChange,
  absence,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  absence: Absence | null
}) {
  const state = useStore((s) => s.state)
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const isNew = !absence

  const [teacher, setTeacher] = React.useState('')
  const [classId, setClassId] = React.useState('')
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')
  const [reason, setReason] = React.useState('Sick')
  const [mode, setMode] = React.useState<'cancel' | 'cover'>('cancel')
  const [cover, setCover] = React.useState('')
  const [note, setNote] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    const today = isoOf(new Date())
    setTeacher(absence?.teacher || '')
    setClassId(absence?.classId || '')
    setFrom(absence?.from || today)
    setTo(absence?.to || absence?.from || today)
    setReason(absence?.reason || 'Sick')
    setMode(absence?.cover ? 'cover' : 'cancel')
    setCover(absence?.cover || '')
    setNote(absence?.note || '')
  }, [open, absence?.id])

  const people = React.useMemo(() => {
    const names = [...state.team.map((t) => t.name), ...state.classes.map((c) => c.teacher)].filter(Boolean)
    return Array.from(new Set(names))
  }, [state.team, state.classes])
  const theirClasses = state.classes.filter((c) => c.teacher === teacher)

  const save = () => {
    if (!teacher.trim()) return toast('Pick the teacher who is away', false)
    if (!from || !to) return toast('Pick the dates', false)
    if (to < from) return toast('The last day cannot be before the first day', false)
    if (mode === 'cover' && !cover.trim()) return toast('Pick who is covering, or choose cancel the classes', false)
    const entry: Absence = {
      id: absence?.id || uid(),
      teacher: teacher.trim(),
      classId: classId || undefined,
      from,
      to,
      reason,
      cover: mode === 'cover' ? cover.trim() : undefined,
      note: note.trim() || undefined,
    }
    patch((draft) => {
      const list = (draft.absences ||= [])
      const i = list.findIndex((a) => a.id === entry.id)
      if (i >= 0) list[i] = entry
      else list.push(entry)
    })
    toast(isNew ? 'Absence saved, calendars updated' : 'Absence updated')
    onOpenChange(false)
  }

  const choice = (on: boolean) =>
    cn(
      'flex-1 rounded-lg border px-3 py-2 text-left text-sm transition',
      on ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-border hover:bg-secondary',
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Teacher away' : 'Edit absence'}</DialogTitle>
          <DialogDescription>
            The teachers calendar, today&apos;s list and the room calendar update on their own for these dates.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="abs-teacher">Who is away</Label>
            <PickOrType id="abs-teacher" value={teacher} onChange={(v) => { setTeacher(v); setClassId('') }} options={people} placeholder="Pick a teacher" emptyLabel="Pick a teacher" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="abs-from">First day</Label>
              <Input id="abs-from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); if (!to || to < e.target.value) setTo(e.target.value) }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="abs-to">Last day</Label>
              <Input id="abs-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div className="-mt-2 flex flex-wrap gap-1.5 text-xs">
            {[['Today only', 0], ['This week', 'week'], ['Two weeks', 13]].map(([label, n]) => (
              <button
                key={String(label)}
                type="button"
                className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-foreground/80 hover:bg-secondary/70"
                onClick={() => {
                  const start = new Date()
                  const f = isoOf(start)
                  const end = new Date(start)
                  if (n === 'week') end.setDate(end.getDate() + (7 - ((end.getDay() + 6) % 7) - 1))
                  else end.setDate(end.getDate() + Number(n))
                  setFrom(f)
                  setTo(isoOf(end))
                }}
              >
                {label as string}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Reason</Label>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <button key={r} type="button" onClick={() => setReason(r)} className={cn('rounded-full border px-3 py-1 text-sm', reason === r ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-border hover:bg-secondary')}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Which classes</Label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm" disabled={!teacher}>
              <option value="">{teacher ? `All of ${teacher}'s classes${theirClasses.length ? ` (${theirClasses.map((c) => c.code).join(', ')})` : ''}` : 'Pick a teacher first'}</option>
              {theirClasses.map((c) => <option key={c.id} value={c.id}>Only {c.code}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>What happens to the classes</Label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode('cancel')} className={choice(mode === 'cancel')}>Cancelled<span className="block text-[11px] font-normal opacity-75">the room becomes free</span></button>
              <button type="button" onClick={() => setMode('cover')} className={choice(mode === 'cover')}>Someone covers<span className="block text-[11px] font-normal opacity-75">the class still runs</span></button>
            </div>
            {mode === 'cover' && (
              <PickOrType id="abs-cover" value={cover} onChange={setCover} options={people.filter((p) => p !== teacher)} placeholder="Who is covering" emptyLabel="Pick the substitute" />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="abs-note">Note (optional)</Label>
            <Input id="abs-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Only you see this" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" className="rounded-lg" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="rounded-lg" onClick={save}>{isNew ? 'Save absence' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
