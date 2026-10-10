'use client'

import * as React from 'react'
import { Pencil, Plus, Trash2, UserX } from 'lucide-react'
import { useStore } from '@/lib/store'
import { fmtAbsenceRange, isoOf, parseISO } from '@/lib/app-utils'
import { DAY_KEYS } from '@/lib/constants'
import { PageHead, EmptyState, Chip } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { AbsenceDialog } from '@/components/dialogs/absence-dialog'
import type { Absence } from '@/lib/types'

export function AbsencesPage() {
  const state = useStore((s) => s.state)
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const [dialog, setDialog] = React.useState<{ open: boolean; abs: Absence | null }>({ open: false, abs: null })

  const today = isoOf(new Date())
  const all = [...(state.absences || [])].sort((a, b) => a.from.localeCompare(b.from))
  const now = all.filter((a) => a.from <= today && a.to >= today)
  const next = all.filter((a) => a.from > today)
  const past = all.filter((a) => a.to < today).reverse()

  const remove = (a: Absence) => {
    patch((d) => { d.absences = (d.absences || []).filter((x) => x.id !== a.id) })
    toast('Absence removed, classes are back on the calendars')
  }

  /* how many class sessions fall inside the dates, so an absence that changes nothing is obvious */
  const sessionsIn = (a: Absence) => {
    const mine = state.classes.filter((c) => c.teacher === a.teacher && (!a.classId || a.classId === c.id))
    let n = 0
    const d = parseISO(a.from)
    for (let i = 0; i < 400 && isoOf(d) <= a.to; i++, d.setDate(d.getDate() + 1)) {
      const key = DAY_KEYS[(d.getDay() + 6) % 7]
      n += mine.filter((c) => (c.days || []).includes(key)).length
    }
    return n
  }

  const classesOf = (a: Absence) => state.classes.filter((c) => c.teacher === a.teacher && (!a.classId || a.classId === c.id)).map((c) => c.code)

  const card = (a: Absence, dim = false) => (
    <div key={a.id} className={`flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm ${dim ? 'opacity-60' : ''}`}>
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF3B30]/10 text-[#FF3B30]"><UserX className="h-4.5 w-4.5" /></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold">{a.teacher}</span>
          <Chip tone={a.cover ? 'primary' : 'gold'}>{a.cover ? `Covered by ${a.cover}` : 'Classes cancelled'}</Chip>
        </div>
        <div className="mt-0.5 text-sm text-muted-foreground">
          {fmtAbsenceRange(a)} · {a.reason}
          {classesOf(a).length ? ` · ${classesOf(a).join(', ')}` : ' · no classes found for this teacher'}
        </div>
        <div className="mt-1 text-[13px] font-medium text-foreground/80">
          {sessionsIn(a) > 0 ? `${sessionsIn(a)} class ${sessionsIn(a) === 1 ? 'session is' : 'sessions are'} ${a.cover ? 'covered' : 'cancelled'}` : 'No class of this teacher falls on these dates, so nothing changes'}
        </div>
        {a.note && <div className="mt-1 text-[13px] text-foreground/80">{a.note}</div>}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon" onClick={() => setDialog({ open: true, abs: a })} title="Edit"><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(a)} title="Remove: the classes return to the calendars"><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  )

  const section = (title: string, list: Absence[], dim = false) =>
    list.length > 0 && (
      <div className="mb-6">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
        <div className="grid gap-2.5">{list.map((a) => card(a, dim))}</div>
      </div>
    )

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <PageHead
        title="Absences"
        subtitle="When a teacher cannot come, enter it here and every calendar updates for those dates."
        right={<Button size="sm" onClick={() => setDialog({ open: true, abs: null })}><Plus className="h-4 w-4" /> Teacher away</Button>}
      />
      {all.length === 0 ? (
        <EmptyState icon={<UserX className="h-5 w-5" />} title="Nobody is away" hint="Use Teacher away when someone is sick or travelling. Their classes are cancelled or covered, and the rooms show as free." />
      ) : (
        <>
          {section('Away now', now)}
          {section('Coming up', next)}
          {section('Earlier', past, true)}
        </>
      )}
      <AbsenceDialog open={dialog.open} onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))} absence={dialog.abs} />
    </div>
  )
}
