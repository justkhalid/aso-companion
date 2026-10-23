'use client'

import * as React from 'react'
import { Plus, Home, Users, AlertTriangle, GraduationCap } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHead, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { ClassDialog } from '@/components/dialogs/class-dialog'
import { RowActions } from '@/components/admin/row-actions'
import { ArchiveGroup } from '@/components/session-card'
import { isClassOver } from '@/lib/archive'
import { cn } from '@/lib/utils'
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

  const [filter, setFilter] = React.useState<'all' | Audience | 'Other'>('all')
  const isOver = (c: ClassEntry) => isClassOver(c)
  const live = state.classes.filter((c) => !isOver(c))
  const over = state.classes.filter(isOver)
  const rows = live.map((c) => ({ c, mark: classMark(state, c) }))
  const countOf = (k: string) => rows.filter((r) => (r.mark?.audience ?? 'Other') === k).length
  const sections = GROUPS.filter((g) => filter === 'all' || g.key === filter).map((g) => ({
    ...g,
    list: rows
      .filter((r) => (r.mark?.audience ?? 'Other') === g.key)
      .sort((a, b) => (a.mark?.step ?? 0) - (b.mark?.step ?? 0) || DAY_ORDER.indexOf(a.c.days?.[0] ?? '') - DAY_ORDER.indexOf(b.c.days?.[0] ?? '') || a.c.code.localeCompare(b.c.code)),
  })).filter((g) => g.list.length)

  /* one row per class: the same five columns in every group, so teachers, rooms and times line up from top to bottom */
  const COLS = 'sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,.8fr)_auto]'
  const line = (c: ClassEntry) => {
    const [from, to] = (fmtTime(c.time) || '').split(' - ')
    const days = (c.days || []).slice().sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
    const missing = (label: string) => <span className="inline-flex items-center gap-1 font-semibold text-[var(--aso-gold)]"><AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {label}</span>
    return (
      <div key={c.id} className={cn('grid items-center gap-x-4 gap-y-1 px-4 py-3 text-[13px]', COLS, isOver(c) && 'opacity-70')}>
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="truncate text-[14px] font-extrabold tracking-tight">{publicGroupName(c.code, c.level)}</h3>
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">{c.code}</span>
          {isOver(c) && <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">Ended</span>}
        </div>
        <div className="font-semibold tabular-nums">
          {days.length || from ? <>{days.join(' · ') || 'No day'} <span className="text-muted-foreground">{from ? `${from}${to ? ` - ${to}` : ''}` : ''}</span></> : missing('No time')}
        </div>
        <div className="inline-flex min-w-0 items-center gap-1.5 truncate font-semibold"><Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden /> {c.teacher || missing('No teacher')}</div>
        <div className="inline-flex min-w-0 items-center gap-1.5 truncate font-semibold text-muted-foreground"><Home className="h-3.5 w-3.5 shrink-0" aria-hidden /> {c.room || missing('No room')}</div>
        <div className="flex justify-end sm:justify-self-end">
          <RowActions
            name={c.code}
            onEdit={() => setDialog({ open: true, cls: c })}
            onDuplicate={() => duplicate(c)}
            remove={(d) => { d.classes = d.classes.filter((x) => x.id !== c.id) }}
            deleteNote="The class card is removed. Weeks and team are not affected."
          />
        </div>
      </div>
    )
  }
  const table = (list: ClassEntry[]) => <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">{list.map(line)}</div>

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
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Show">
            {([['all', 'All', live.length], ...GROUPS.filter((g) => countOf(g.key) > 0).map((g) => [g.key, g.key === 'Other' ? 'Other' : g.key, countOf(g.key)])] as [string, string, number][]).map(([k, label, n]) => (
              <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k as typeof filter)} className={cn('rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition', filter === k ? 'aso-nav-pill border-transparent' : 'border-border bg-card text-foreground/75 hover:bg-secondary')}>
                {label} <span className="ml-1 text-[11px] opacity-70">{n}</span>
              </button>
            ))}
          </div>
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
                      {steps.length > 1 && <div className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{STEP[st]}</div>}
                      {table(g.list.filter((r) => (r.mark?.step ?? 0) === st).map((r) => r.c))}
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
          <ArchiveGroup count={over.length}>
            {table(over)}
          </ArchiveGroup>
        </div>
      )}

      <ClassDialog open={dialog.open} onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))} cls={dialog.cls} />
    </div>
  )
}
