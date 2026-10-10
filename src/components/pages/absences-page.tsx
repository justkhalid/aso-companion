'use client'

import * as React from 'react'
import { Plus, UserX, UserCheck } from 'lucide-react'
import { useStore } from '@/lib/store'
import { fmtAbsenceRange, isOnceEvent, isoOf, parseISO } from '@/lib/app-utils'
import { DAY_KEYS } from '@/lib/constants'
import { PageHead, EmptyState, Chip } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { AbsenceDialog } from '@/components/dialogs/absence-dialog'
import { RowActions } from '@/components/admin/row-actions'
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

  /* "back today": sessions from today on return to the calendars, earlier days stay recorded */
  const backToday = (a: Absence) => {
    const before = a
    const yesterday = parseISO(today)
    yesterday.setDate(yesterday.getDate() - 1)
    patch((d) => {
      if (a.from >= today) d.absences = (d.absences || []).filter((x) => x.id !== a.id)
      else d.absences = (d.absences || []).map((x) => (x.id === a.id ? { ...x, to: isoOf(yesterday) } : x))
    })
    toast('Back from today, the calendars are updated', true, {
      label: 'Undo',
      run: () => patch((d) => {
        d.absences = (d.absences || []).filter((x) => x.id !== before.id)
        d.absences.push(before)
      }),
    })
  }

  /* what the entry is about: a teacher with classes, a club or an event */
  const subject = (a: Absence) => {
    if (a.kind === 'club') {
      const c = state.clubs.find((x) => x.id === a.clubId)
      return { title: c?.name || 'Club (deleted)', what: 'club', days: c?.days || [], once: null as string | null }
    }
    if (a.kind === 'event') {
      const e = state.events.find((x) => x.id === a.eventId)
      const once = e && isOnceEvent(e)
      return { title: e?.title || 'Event (deleted)', what: 'event', days: e && !once && e.day ? [e.day] : [], once: once && e?.date ? e.date : null }
    }
    const mine = state.classes.filter((c) => c.teacher === a.teacher && (!a.classId || a.classId === c.id))
    return { title: a.teacher, what: 'class', days: mine.flatMap((c) => c.days || []), once: null as string | null, codes: mine.map((c) => c.code) }
  }

  /* how many sessions fall inside the dates, so an entry that changes nothing is obvious */
  const sessionsIn = (a: Absence) => {
    const sub = subject(a)
    if (sub.once) return sub.once >= a.from && sub.once <= a.to ? 1 : 0
    let n = 0
    const d = parseISO(a.from)
    for (let i = 0; i < 400 && isoOf(d) <= a.to; i++, d.setDate(d.getDate() + 1)) {
      const key = DAY_KEYS[(d.getDay() + 6) % 7]
      n += sub.days.filter((x) => x === key).length
    }
    return n
  }

  const card = (a: Absence, dim = false) => {
    const sub = subject(a)
    const n = sessionsIn(a)
    const verb = a.cover ? 'covered' : 'cancelled'
    return (
      <div key={a.id} className={`flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm ${dim ? 'opacity-60' : ''}`}>
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF3B30]/10 text-[#FF3B30]"><UserX className="h-4.5 w-4.5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold">{sub.title}</span>
            <Chip>{a.kind === 'club' ? 'Club' : a.kind === 'event' ? 'Event' : 'Teacher away'}</Chip>
            <Chip tone={a.cover ? 'primary' : 'gold'}>{a.cover ? (a.kind === 'club' ? `Led by ${a.cover}` : `Covered by ${a.cover}`) : 'Cancelled'}</Chip>
          </div>
          <div className="mt-0.5 text-sm text-muted-foreground">
            {fmtAbsenceRange(a)} · {a.reason}
            {a.kind !== 'club' && a.kind !== 'event' && 'codes' in sub && sub.codes?.length ? ` · ${sub.codes.join(', ')}` : ''}
          </div>
          <div className="mt-1 text-[13px] font-medium text-foreground/80">
            {n > 0 ? `${n} ${sub.what} ${n === 1 ? 'session is' : 'sessions are'} ${verb}` : `Nothing of this ${sub.what === 'class' ? 'teacher' : sub.what} falls on these dates, so nothing changes`}
          </div>
          {a.note && <div className="mt-1 text-[13px] text-foreground/80">{a.note}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {a.from <= today && a.to >= today && (
            <Button variant="outline" size="sm" onClick={() => backToday(a)}>
              <UserCheck className="h-4 w-4" /> Back today
            </Button>
          )}
          <RowActions
            name={`absence of ${sub.title}`}
            onEdit={() => setDialog({ open: true, abs: a })}
            remove={(d) => { d.absences = (d.absences || []).filter((x) => x.id !== a.id) }}
            deleteNote="Everything returns to the calendars for those dates."
          />
        </div>
      </div>
    )
  }

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
        title="Absences and cancellations"
        subtitle="A teacher cannot come, a club or an event is off: enter it here and every calendar updates for those dates."
        right={<Button size="sm" onClick={() => setDialog({ open: true, abs: null })}><Plus className="h-4 w-4" /> Report absence</Button>}
      />
      {all.length === 0 ? (
        <EmptyState icon={<UserX className="h-5 w-5" />} title="Nothing is cancelled" hint="Use Report absence when a teacher is sick or travelling, or a club or event does not happen. It is cancelled or covered, and the room shows as free." />
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
