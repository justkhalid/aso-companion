'use client'

import * as React from 'react'
import { Plus, Home, Users, AlertTriangle, GraduationCap } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHead, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { ClassDialog } from '@/components/dialogs/class-dialog'
import { RowActions } from '@/components/admin/row-actions'
import { uid, fmtTime } from '@/lib/app-utils'
import { classMark, type Audience } from '@/lib/class-marks'
import { publicGroupName } from '@/lib/calendar-items'
import type { ClassEntry } from '@/lib/types'

/* Each audience has one colour, the same on this page and on the posters: kids orange, teens pink, adults blue */
const GROUPS: { key: Audience | 'Other'; title: string; hint: string; tone: string }[] = [
  { key: 'Kids', title: 'Kids', hint: 'Children', tone: 'tone-11' },
  { key: 'Teens', title: 'Teens', hint: 'Teenagers', tone: 'tone-12' },
  { key: 'Adults', title: 'Adults', hint: 'Grown-ups', tone: 'tone-9' },
  { key: 'Other', title: 'Other groups', hint: 'No audience in the level', tone: 'tone-8' },
]
const STEP = ['Level not set', 'Beginner', 'Intermediate', 'Advanced']
const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function ClassesPage() {
  const state = useStore((s) => s.state)
  const patch = useStore((s) => s.patch)
  const [dialog, setDialog] = React.useState<{ open: boolean; cls: ClassEntry | null }>({ open: false, cls: null })

  const duplicate = (c: ClassEntry) => {
    const copy = { ...c, id: uid(), code: c.code + ' copy' }
    patch((d) => { d.classes.push(copy) })
    setDialog({ open: true, cls: copy })
  }

  const rows = state.classes.map((c) => ({ c, mark: classMark(state, c) }))
  const sections = GROUPS.map((g) => ({
    ...g,
    list: rows
      .filter((r) => (r.mark?.audience ?? 'Other') === g.key)
      .sort((a, b) => (a.mark?.step ?? 0) - (b.mark?.step ?? 0) || DAY_ORDER.indexOf(a.c.days?.[0] ?? '') - DAY_ORDER.indexOf(b.c.days?.[0] ?? '') || a.c.code.localeCompare(b.c.code)),
  })).filter((g) => g.list.length)

  const card = (c: ClassEntry, tone: string) => {
    const [from, to] = (fmtTime(c.time) || '').split(' - ')
    const days = (c.days || []).slice().sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
    return (
      <div key={c.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
        <div className={`${tone} flex w-[88px] shrink-0 flex-col items-center justify-center rounded-xl px-1 py-2 text-center`} style={{ background: 'var(--tone-bg)', color: 'var(--tone-txt)' }}>
          <span className="text-[11px] font-extrabold uppercase tracking-wide">{days.join(' · ') || 'No day'}</span>
          <span className="mt-0.5 text-[17px] font-extrabold leading-tight tabular-nums">{from || '-'}</span>
          {to && <span className="text-[11px] font-semibold opacity-80">to {to}</span>}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate text-[15px] font-extrabold tracking-tight">{publicGroupName(c.code, c.level)}</h3>
            <span className="shrink-0 text-xs font-semibold text-muted-foreground">{c.code}</span>
          </div>
          <div className="mt-1.5 grid gap-1 text-[13px]">
            <span className="inline-flex items-center gap-1.5 font-semibold"><Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /> {c.teacher || <span className="inline-flex items-center gap-1 text-[var(--aso-gold)]"><AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Needs a teacher</span>}</span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground"><Home className="h-3.5 w-3.5" aria-hidden /> {c.room || <span className="text-[var(--aso-gold)]">No room</span>}</span>
          </div>
          <div className="mt-2.5 flex justify-end">
            <RowActions
              name={c.code}
              onEdit={() => setDialog({ open: true, cls: c })}
              onDuplicate={() => duplicate(c)}
              remove={(d) => { d.classes = d.classes.filter((x) => x.id !== c.id) }}
              deleteNote="The class card is removed. Weeks and team are not affected."
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <PageHead
        title="Classes"
        subtitle={`${state.classes.length} groups · ${state.settings.year}`}
        right={
          <Button size="sm" onClick={() => setDialog({ open: true, cls: null })}>
            <Plus className="h-4 w-4" /> Add class
          </Button>
        }
      />

      {state.classes.length === 0 ? (
        <EmptyState icon={<Users className="h-5 w-5" />} title="No classes yet" hint="Add your first group." />
      ) : (
        <div className="grid gap-6">
          {sections.map((g) => {
            const steps = Array.from(new Set(g.list.map((r) => r.mark?.step ?? 0)))
            return (
              <section key={g.key} aria-label={g.title}>
                <h2 className={`${g.tone} mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold tracking-tight`} style={{ background: 'var(--tone-bg)', color: 'var(--tone-txt)' }}>
                  <GraduationCap className="h-4 w-4" aria-hidden /> {g.title}
                  <span className="ml-auto text-xs font-bold opacity-80">{g.list.length} {g.list.length === 1 ? 'class' : 'classes'}</span>
                </h2>
                <div className="grid gap-4">
                  {steps.map((st) => (
                    <div key={st}>
                      {steps.length > 1 && <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{STEP[st]}</div>}
                      <div className="grid gap-3 sm:grid-cols-2">{g.list.filter((r) => (r.mark?.step ?? 0) === st).map((r) => card(r.c, g.tone))}</div>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <ClassDialog open={dialog.open} onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))} cls={dialog.cls} />
    </div>
  )
}
