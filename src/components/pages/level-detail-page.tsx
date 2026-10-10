'use client'

import * as React from 'react'
import {
  Plus,
  Pencil,
  BookOpen,
  ChevronRight,
  CalendarDays,
  Star,
  Trash2,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import {
  termStatus,
  weekMonday,
  fmtD,
  noteFor,
  s1Weeks,
  skillsOf,
  spotlightOf,
} from '@/lib/app-utils'
import { SKILLS, DAY_FULL, KIT_STAGE_LABELS } from '@/lib/constants'
import { Chip, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { WeekDialog } from '@/components/dialogs/week-dialog'
import { LessonPlanDialog } from '@/components/dialogs/lesson-plan-dialog'
import { LevelDialog } from '@/components/dialogs/level-dialog'

const SKILL_NAMES: Record<string, string> = {
  L: 'Listening',
  S: 'Speaking',
  R: 'Reading',
  W: 'Writing',
}

export function LevelDetailPage({ admin }: { admin: boolean }) {
  const state = useStore((s) => s.state)
  const selectedLevelKey = useStore((s) => s.selectedLevelKey)
  const setView = useStore((s) => s.setView)
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)

  const level = state.levels.find((l) => l.key === selectedLevelKey)

  const [seg, setSeg] = React.useState(0) // 0 = S1, 1 = S2
  const [openWeeks, setOpenWeeks] = React.useState<Set<number>>(new Set())
  const [editWeek, setEditWeek] = React.useState<{ open: boolean; wi: number }>({
    open: false,
    wi: -1,
  })
  const [lpWeek, setLpWeek] = React.useState<{ open: boolean; wi: number }>({
    open: false,
    wi: -1,
  })
  const [editLevelOpen, setEditLevelOpen] = React.useState(false)

  // when level changes, reset semester based on current week
  React.useEffect(() => {
    if (!level) return
    const st = termStatus(state)
    const curWi = st.mode === 's1' || st.mode === 's2' ? (st.week || 1) - 1 : -1
    if (curWi >= 0) setSeg(curWi < s1Weeks(state) ? 0 : 1)
    else setSeg(0)
    setOpenWeeks(new Set())
  }, [selectedLevelKey, level, state])

  if (!level) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState title="Level not found" hint="It may have been removed." />
        <Button className="mt-4" onClick={() => setView('eltaso')}>
          Back to ELTASO
        </Button>
      </div>
    )
  }

  const st = termStatus(state)
  const n1 = s1Weeks(state)
  const total = level.weeks.length
  const inS1 = seg === 0
  const from = inS1 ? 0 : n1
  const to = inS1 ? Math.min(n1, total) : total
  const curWi = st.mode === 's1' || st.mode === 's2' ? (st.week || 1) - 1 : -1

  const toggleWeek = (wi: number) =>
    setOpenWeeks((s) => {
      const next = new Set(s)
      if (next.has(wi)) next.delete(wi)
      else next.add(wi)
      return next
    })

  const addWeek = () => {
    patch((draft) => {
      const lv = draft.levels.find((l) => l.key === level.key)
      if (!lv) return
      lv.weeks.push({
        theme: '',
        obj: '',
        lang: '',
        res: '',
        urls: [],
        act: '',
        hw: '',
        skills: { L: '', S: '', R: '', W: '' },
      })
    })
    setSeg(level.weeks.length > n1 ? 1 : 0)
    setOpenWeeks(new Set([level.weeks.length]))
    toast(`Week ${level.weeks.length + 1} added`)
  }

  const removeLevel = () => {
    patch((draft) => {
      draft.levels = draft.levels.filter((l) => l.key !== level.key)
    })
    toast('Level removed')
    setView('eltaso')
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      {/* header */}
      <div className="mb-5 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => setView('eltaso')}
            className="mb-1 text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            ← ELTASO
          </button>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight">
            {level.label}
            <Chip tone="primary">{level.cefr}</Chip>
          </h1>
          {level.desc && (
            <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-foreground/90">
              {level.desc}
            </p>
          )}
          <p className="mt-1.5 text-sm text-muted-foreground">
            {total} weeks · {state.settings.year} · all four skills weekly · tap a week to open it
          </p>
        </div>
        {admin && (
          <Button variant="ghost" size="icon" onClick={() => setEditLevelOpen(true)} title="Rename / remove level">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* current week banner */}
      {curWi >= 0 && curWi < total && (
        <button
          onClick={() => {
            setSeg(curWi < n1 ? 0 : 1)
            setOpenWeeks(new Set([curWi]))
          }}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-bold">This week · W{curWi + 1} · {level.weeks[curWi].theme}</div>
            <div className="text-sm text-muted-foreground">
              {fmtD(weekMonday(state, curWi), { day: 'numeric', month: 'long' })}
              {noteFor(state, curWi) ? ` · ${noteFor(state, curWi)}` : ''}
            </div>
          </div>
          <span className="text-xs font-bold text-primary">Open week</span>
        </button>
      )}

      {/* semester toggle */}
      <div className="mb-4 flex items-center gap-3">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
          <button
            onClick={() => setSeg(0)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-bold transition',
              inS1 ? 'bg-background shadow-sm' : 'text-muted-foreground',
            )}
          >
            Semester 1
          </button>
          <button
            onClick={() => setSeg(1)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-bold transition',
              !inS1 ? 'bg-background shadow-sm' : 'text-muted-foreground',
            )}
          >
            Semester 2
          </button>
        </div>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">
          {inS1 ? `Weeks 1-${n1}` : `Weeks ${n1 + 1}-${Math.max(n1 + 1, total)}`}
        </span>
      </div>

      {/* week rows */}
      {from >= to ? (
        <EmptyState icon={<BookOpen className="h-5 w-5" />} title="No weeks in this semester yet" hint={admin ? 'Add one below.' : 'Check back soon.'} />
      ) : (
        <div className="flex flex-col gap-2">
          {Array.from({ length: to - from }, (_, i) => {
            const wi = from + i
            const w = level.weeks[wi]
            const isOpen = openWeeks.has(wi)
            const isCur = wi === curWi
            const note = noteFor(state, wi)
            const sk = skillsOf(w)
            const sp = spotlightOf(wi)
            return (
              <div
                key={wi}
                className={cn(
                  'overflow-hidden rounded-2xl border bg-card shadow-sm transition',
                  isOpen ? 'border-primary/40' : 'border-border',
                  isCur && 'ring-2 ring-primary/30',
                )}
              >
                <button
                  onClick={() => toggleWeek(wi)}
                  className="flex w-full items-center gap-3 p-3 text-left sm:p-4"
                >
                  <div className={cn(
                    'flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg',
                    isCur ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
                  )}>
                    <span className="text-lg font-extrabold leading-none">{wi + 1}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wide opacity-70">Week</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{w.theme || 'Untitled week'}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">
                        {fmtD(weekMonday(state, wi), { day: 'numeric', month: 'short' })}
                      </span>
                      {sk && SKILLS.map((s) => (
                        <span
                          key={s.k}
                          className={cn(
                            'sk-' + s.k,
                            'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-extrabold',
                            s.k === sp && 'ring-2 ring-offset-1 ring-offset-card',
                          )}
                          title={SKILL_NAMES[s.k]}
                        >
                          {s.k}
                        </span>
                      ))}
                      {isCur && <Chip tone="primary">This week</Chip>}
                      {note && (
                        <Chip tone="gold">
                          <Star className="h-2.5 w-2.5" /> {note}
                        </Chip>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={cn('h-5 w-5 shrink-0 text-muted-foreground transition', isOpen && 'rotate-90')} />
                </button>

                {isOpen && (
                  <div className="border-t border-border px-3 pb-3 pt-2 sm:px-4">
                    <div className="flex flex-col gap-3 py-2">
                      <Field label="Objectives">
                        {w.obj || '-'}
                      </Field>
                      {sk && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {SKILLS.map((s) => (
                            <div key={s.k} className="rounded-lg border border-border p-2.5">
                              <div className="mb-1 flex items-center gap-2">
                                <span className={cn('sk-' + s.k, 'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold')}>
                                  {s.k}
                                </span>
                                <span className="text-xs font-bold">{s.name}</span>
                                {s.k === sp && <Chip tone="primary">spotlight</Chip>}
                              </div>
                              <div className="text-[13px] leading-relaxed text-foreground/90">
                                {sk[s.k] || '-'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <Field label="Key language">{w.lang || '-'}</Field>
                      <Field label="Resources">
                        {w.res || '-'}
                        {w.kit && w.kit.length > 0 && (
                          <div className="mt-1.5 flex flex-col gap-1">
                            {w.kit.map((k, i) => (
                              <a
                                key={i}
                                href={k.u}
                                target="_blank"
                                rel="noopener"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                              >
                                {KIT_STAGE_LABELS[k.s] || k.s}: {k.l}
                              </a>
                            ))}
                          </div>
                        )}
                        {w.urls && w.urls.length > 0 && !(w.kit && w.kit.length > 0) && (
                          <div className="mt-1.5 flex flex-col gap-1">
                            {w.urls.map((u, i) => (
                              <a
                                key={i}
                                href={u}
                                target="_blank"
                                rel="noopener"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                              >
                                Drive folder {i + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </Field>
                      <Field label="Activities">{w.act || '-'}</Field>
                      {w.occ && (w.occ.act || w.occ.hw) && (
                        <Field label="Occasion this week (optional)">
                          {[w.occ.act, w.occ.hw && 'Homework: ' + w.occ.hw].filter(Boolean).join('\n')}
                        </Field>
                      )}
                      <Field label="Homework">{w.hw || '-'}</Field>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {admin && (
                          <Button variant="outline" size="sm" onClick={() => setEditWeek({ open: true, wi })}>
                            <Pencil className="h-3.5 w-3.5" /> Edit week
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setLpWeek({ open: true, wi })}>
                          <BookOpen className="h-3.5 w-3.5" /> Lesson plan
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {admin && (
        <Button variant="ghost" className="mt-3 w-full border border-dashed border-border" onClick={addWeek}>
          <Plus className="h-4 w-4" /> Add week {total + 1}
        </Button>
      )}

      <WeekDialog
        open={editWeek.open}
        onOpenChange={(v) => setEditWeek((s) => ({ ...s, open: v }))}
        level={level}
        weekIndex={editWeek.wi}
      />
      <LessonPlanDialog
        open={lpWeek.open}
        onOpenChange={(v) => setLpWeek((s) => ({ ...s, open: v }))}
        level={level}
        weekIndex={lpWeek.wi}
      />
      {admin && (
        <LevelDialog
          open={editLevelOpen}
          onOpenChange={setEditLevelOpen}
          level={level}
        />
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-[14px] leading-relaxed text-foreground/90 whitespace-pre-line">{children}</div>
    </div>
  )
}
