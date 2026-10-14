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
import { PickOrType, TimeRangeSelect, WhereField } from '@/components/forms/form-controls'
import { useStore } from '@/lib/store'
import { peopleOf, isoOf, uid, roomOptionsFor, outsidePlacesOf } from '@/lib/app-utils'
import { cn } from '@/lib/utils'
import type { Absence } from '@/lib/types'

const REASONS = ['Sick', 'Away', 'Holiday', 'Other']
type Kind = 'teacher' | 'club' | 'event'
const KINDS: { k: Kind; label: string }[] = [
  { k: 'teacher', label: 'Teacher away' },
  { k: 'club', label: 'Club' },
  { k: 'event', label: 'Event' },
]

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

  const [kind, setKind] = React.useState<Kind>('teacher')
  const [clubId, setClubId] = React.useState('')
  const [eventId, setEventId] = React.useState('')
  const [teacher, setTeacher] = React.useState('')
  const [classId, setClassId] = React.useState('')
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')
  const [reason, setReason] = React.useState('Sick')
  const [mode, setMode] = React.useState<'cancel' | 'cover' | 'move'>('cancel')
  const [mvPlace, setMvPlace] = React.useState('')
  const [mvOutside, setMvOutside] = React.useState(true)
  const [mvTime, setMvTime] = React.useState('')
  const [cover, setCover] = React.useState('')
  const [note, setNote] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    const today = isoOf(new Date())
    setKind(absence?.kind || 'teacher')
    setClubId(absence?.clubId || '')
    setEventId(absence?.eventId || '')
    setTeacher(absence?.teacher || '')
    setClassId(absence?.classId || '')
    setFrom(absence?.from || today)
    setTo(absence?.to || absence?.from || today)
    setReason(absence?.reason || 'Sick')
    setMode(absence?.moved ? 'move' : absence?.cover ? 'cover' : 'cancel')
    setMvPlace(absence?.moved?.place || '')
    setMvOutside(absence?.moved ? !!absence.moved.outside : true)
    setMvTime(absence?.moved?.time || '')
    setCover(absence?.cover || '')
    setNote(absence?.note || '')
  }, [open, absence?.id])

  const people = React.useMemo(() => {
    const names = [...peopleOf(state).map((t) => t.name), ...state.classes.map((c) => c.teacher)].filter(Boolean)
    return Array.from(new Set(names))
  }, [state.team, state.classes])
  const theirClasses = state.classes.filter((c) => c.teacher === teacher)

  const save = () => {
    if (kind === 'teacher' && !teacher.trim()) return toast('Pick the teacher who is away', false)
    if (kind === 'club' && !clubId) return toast('Pick the club', false)
    if (kind === 'event' && !eventId) return toast('Pick the event', false)
    if (!from || !to) return toast('Pick the dates', false)
    if (to < from) return toast('The last day cannot be before the first day', false)
    if (mode === 'move' && !mvPlace.trim() && !mvTime) return toast('Say where it moves to, or the new time', false)
    if (mode === 'cover' && !cover.trim()) return toast('Pick who is covering, or choose cancelled', false)
    const entry: Absence = {
      id: absence?.id || uid(),
      kind,
      teacher: kind === 'teacher' ? teacher.trim() : '',
      classId: kind === 'teacher' ? classId || undefined : undefined,
      clubId: kind === 'club' ? clubId : undefined,
      eventId: kind === 'event' ? eventId : undefined,
      from,
      to,
      reason: mode === 'move' ? 'Moved' : reason,
      cover: kind !== 'event' && mode === 'cover' ? cover.trim() : undefined,
      moved: kind !== 'teacher' && mode === 'move' ? { place: mvPlace.trim(), ...(mvOutside ? { outside: true } : {}), ...(mvTime ? { time: mvTime } : {}) } : undefined,
      note: note.trim() || undefined,
    }
    patch((draft) => {
      const list = (draft.absences ||= [])
      const i = list.findIndex((a) => a.id === entry.id)
      if (i >= 0) list[i] = entry
      else list.push(entry)
    })
    toast(isNew ? 'Saved, calendars updated' : 'Updated')
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
          <DialogTitle>{isNew ? 'Away, cancelled or moved' : 'Edit'}</DialogTitle>
          <DialogDescription>
            The calendars, today&apos;s list and the room calendar update on their own for these dates.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>What is affected</Label>
            <div className="grid grid-cols-3 gap-1 rounded-[10px] bg-secondary p-0.5">
              {KINDS.map((o) => (
                <button key={o.k} type="button" onClick={() => { setKind(o.k); if (o.k === 'event' && mode === 'cover') setMode('cancel'); if (o.k === 'teacher' && mode === 'move') setMode('cancel') }} className={cn('rounded-[8px] py-1.5 text-sm transition', kind === o.k ? 'bg-card font-semibold shadow-sm' : 'text-foreground/70')}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {kind === 'teacher' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="abs-teacher">Who is away</Label>
              <PickOrType id="abs-teacher" value={teacher} onChange={(v) => { setTeacher(v); setClassId('') }} options={people} placeholder="Pick a teacher" emptyLabel="Pick a teacher" />
            </div>
          )}
          {kind === 'club' && (
            <div className="flex flex-col gap-1.5">
              <Label>Which club</Label>
              <select value={clubId} onChange={(e) => setClubId(e.target.value)} className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm">
                <option value="">Pick a club</option>
                {state.clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {kind === 'event' && (
            <div className="flex flex-col gap-1.5">
              <Label>Which event</Label>
              <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm">
                <option value="">Pick an event</option>
                {state.events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
            </div>
          )}

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

          {mode !== 'move' && (
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
          )}

          {kind === 'teacher' && (
          <div className="flex flex-col gap-1.5">
            <Label>Which classes</Label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm" disabled={!teacher}>
              <option value="">{teacher ? `All of ${teacher}'s classes${theirClasses.length ? ` (${theirClasses.map((c) => c.code).join(', ')})` : ''}` : 'Pick a teacher first'}</option>
              {theirClasses.map((c) => <option key={c.id} value={c.id}>Only {c.code}</option>)}
            </select>
          </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>{kind === 'teacher' ? 'What happens to the classes' : kind === 'club' ? 'What happens to the club' : 'What happens to the event'}</Label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode('cancel')} className={choice(mode === 'cancel')}>Cancelled<span className="block text-[11px] font-normal opacity-75">the room becomes free</span></button>
              {kind !== 'teacher' && (
                <button type="button" onClick={() => setMode('move')} className={choice(mode === 'move')}>Held elsewhere<span className="block text-[11px] font-normal opacity-75">only on these dates</span></button>
              )}
              {kind !== 'event' && (
                <button type="button" onClick={() => setMode('cover')} className={choice(mode === 'cover')}>{kind === 'club' ? 'Someone else leads' : 'Someone covers'}<span className="block text-[11px] font-normal opacity-75">{kind === 'club' ? 'the club still runs' : 'the class still runs'}</span></button>
              )}
            </div>
            {kind !== 'teacher' && mode === 'move' && (
              <div className="mt-1 flex flex-col gap-3 rounded-lg border border-border p-3">
                <WhereField id="abs-where" label="Where, on these dates" outside={mvOutside} place={mvPlace} onChange={(p, o) => { setMvPlace(p); setMvOutside(o) }} rooms={roomOptionsFor(state)} outsidePlaces={outsidePlacesOf(state)} />
                <div className="flex flex-col gap-1.5">
                  <Label>New time (optional)</Label>
                  <TimeRangeSelect value={mvTime} onChange={setMvTime} />
                  <span className="text-[11px] text-muted-foreground">Leave it alone to keep the usual time.</span>
                </div>
              </div>
            )}
            {kind !== 'event' && mode === 'cover' && (
              <PickOrType id="abs-cover" value={cover} onChange={setCover} options={people.filter((p) => p !== teacher)} placeholder={kind === 'club' ? 'Who leads instead' : 'Who is covering'} emptyLabel="Pick the substitute" />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="abs-note">Note (optional)</Label>
            <span className="-mt-1 text-[11px] leading-tight text-muted-foreground">The calendars only say &quot;cancelled&quot; or who covers. The reason and this note stay on the Absences page and the admin room calendar, but they are saved with the rest of the app data, so keep them short and avoid private details.</span>
            <Input id="abs-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="For you only, not shown on the calendars" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" className="rounded-lg" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="rounded-lg" onClick={save}>{isNew ? 'Save' : 'Save changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
