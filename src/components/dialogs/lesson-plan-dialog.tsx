'use client'

import * as React from 'react'
import { Copy, Download, BookOpen } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { LP_STAGES_KIDS, LP_STAGES_TEENS } from '@/lib/constants'
import type { Level, LessonPlan } from '@/lib/types'

function buildLpText(level: Level, wi: number): string {
  const w = level.weeks[wi]
  const p = w.lp
  if (!p) return ''
  const isKids = level.band === 'Kids' || level.key.indexOf('kids') === 0
  const dur = isKids ? '2 hours' : '90 minutes'
  let t = `WEEK ${wi + 1} · ${w.theme || ''} (${level.label})\n`
  t += `Objectives: students can ${w.obj || ''}\n\nLESSON PLAN (${dur})\n`
  const stages = isKids
    ? ([
        ['0:00-0:10 Hello & routine', ''],
        ['0:10-0:20 Warm-up review', p.wu],
        ['0:20-0:35 Presentation', p.pres],
        ['0:35-0:50 Practice (guided)', p.prac],
        ['0:50-1:00 Listening slot', p.ls],
        ['BREAK', ''],
        ['1:10-1:20 Reactivation game', p.re],
        ['1:20-1:45 Production task', p.prod],
        ['1:45-1:55 Reading & writing', p.rw],
        ['1:55-2:00 Story/song + goodbye', p.st],
      ] as [string, string][])
    : ([
        ['0:00-0:05 Hello & routine', ''],
        ['0:05-0:15 Warm-up review', p.wu],
        ['0:15-0:30 Presentation', p.pres],
        ['0:30-0:45 Practice (guided)', p.prac],
        ['0:45-0:55 Listening slot', p.ls],
        ['BREAK', ''],
        ['1:00-1:08 Reactivation game', p.re],
        ['1:08-1:22 Production task', p.prod],
        ['1:22-1:28 Reading & writing', p.rw],
        ['1:28-1:30 Story/song + goodbye', p.st],
      ] as [string, string][])
  stages.forEach((r) => {
    t += r[0] + (r[1] ? ': ' + r[1] : '') + '\n'
  })
  if (p.g && p.g.length) {
    t += '\nGAMES / ACTIVITIES\n'
    p.g.forEach((g) => (t += `- ${g[0]}: ${g[1]}\n`))
  }
  if (p.diff && p.diff.length) {
    t += '\nDIFFERENTIATION\n- ' + p.diff.join('\n- ') + '\n'
  }
  if (p.hw && p.hw.length) {
    t += '\nHOMEWORK OPTIONS\n- ' + p.hw.join('\n- ') + '\n'
  }
  if (p.tip) t += '\nTIP: ' + p.tip + '\n'
  if (p.checklist && p.checklist.length) {
    t += '\nASSESSMENT OBSERVATION CHECKLIST (tick during play)\n'
    p.checklist.forEach((c) => {
      t += `  [ ] ${c}   (Not yet / With help / Independently)\n`
    })
  }
  return t
}

export function LessonPlanDialog({
  open,
  onOpenChange,
  level,
  weekIndex,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  level: Level | null
  weekIndex: number
}) {
  const toast = useStore((s) => s.toast)

  if (!level || !open) return null
  const w = level.weeks[weekIndex]
  const p: LessonPlan | undefined = w?.lp

  if (!p) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Lesson plan · Week {weekIndex + 1}</DialogTitle>
          </DialogHeader>
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No detailed lesson plan for this week yet.
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const isKids = level.band === 'Kids' || level.key.indexOf('kids') === 0
  const T = isKids ? LP_STAGES_KIDS : LP_STAGES_TEENS
  const dur = isKids ? '2 hours' : '90 minutes'

  const helloTxt =
    weekIndex === 0
      ? isKids
        ? 'Hello Song + name ball toss; establish the attention signal ("1, 2, 3, eyes on me!").'
        : 'Welcome and icebreaker; establish class routines and the "English only" signal.'
      : isKids
        ? `Hello Song + register; feelings chart check-in${weekIndex >= 20 ? '; weather report' : ''}.`
        : "Warm hello; quick recap of last week + today's goal."
  const brkTxt = isKids ? 'Toilet + water; soft music; sitting signal on return.' : 'Short break; quick stretch / water; regroup.'

  const stage = (
    name: string,
    tm: string,
    main: string,
    alts?: string[],
    isBreak?: boolean,
  ) => (
    <tr className={isBreak ? 'bg-[var(--aso-gold-tint)]' : ''}>
      <td className="w-[20%] px-3 py-2 align-top text-[13px] font-bold text-foreground">{name}</td>
      <td className="w-[14%] px-3 py-2 align-top text-[12px] font-bold text-[var(--aso-gold)] whitespace-nowrap">{tm}</td>
      <td className="px-3 py-2 align-top text-[13px] leading-relaxed text-foreground/90">
        {main}
        {alts && alts.length > 0 && (
          <div className="mt-1.5 text-[12px] text-muted-foreground">
            <b className="text-[var(--aso-gold)]">Also try:</b> {alts.join(' · ')}
          </div>
        )}
      </td>
    </tr>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl scroll-thin">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>Lesson plan · Week {weekIndex + 1}</span>
            <span className="text-sm font-semibold text-muted-foreground">
              {w.theme}
            </span>
          </DialogTitle>
          <div className="text-xs text-muted-foreground">
            {level.label} · {dur}
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* staged table */}
          <div>
            <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
              The {dur} arc
            </div>
            <div className="overflow-x-auto scroll-thin rounded-lg border border-border">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-secondary text-left">
                    <th className="px-3 py-2 text-[12px] font-bold">Stage</th>
                    <th className="px-3 py-2 text-[12px] font-bold">Time</th>
                    <th className="px-3 py-2 text-[12px] font-bold">What happens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stage('Hello & routine', T.hello, helloTxt)}
                  {stage('Warm-up review', T.wu, p.wu, p.wuAlt)}
                  {stage('Presentation', T.pres, p.pres, p.presAlt)}
                  {stage('Practice (guided)', T.prac, p.prac, p.pracAlt)}
                  {stage('Listening slot', T.ls, p.ls)}
                  {stage('BREAK', T.brk, brkTxt, undefined, true)}
                  {stage('Reactivation game', T.re, p.re)}
                  {stage('Production task', T.prod, p.prod)}
                  {stage('Reading & writing', T.rw, p.rw)}
                  {stage('Story / song + goodbye', T.st, p.st)}
                </tbody>
              </table>
            </div>
          </div>

          {/* game bank */}
          {p.g && p.g.length > 0 && (
            <div>
              <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                Game bank / activity bank this week
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full border-collapse">
                  <tbody className="divide-y divide-border">
                    {p.g.map((g, i) => (
                      <tr key={i}>
                        <td className="w-[26%] px-3 py-2 align-top text-[13px] font-bold text-foreground">
                          {g[0]}
                        </td>
                        <td className="px-3 py-2 align-top text-[13px] leading-relaxed text-foreground/90">
                          {g[1]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* differentiation */}
          {p.diff && p.diff.length > 0 && (
            <div>
              <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                Differentiation
              </div>
              <ul className="space-y-1 text-[13px] leading-relaxed">
                {p.diff.map((d, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">-</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* homework */}
          {p.hw && p.hw.length > 0 && (
            <div>
              <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                Homework options
              </div>
              <ul className="space-y-1 text-[13px] leading-relaxed">
                {p.hw.map((d, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">-</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* tip */}
          {p.tip && (
            <div>
              <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                Teacher tip
              </div>
              <p className="text-[13px] leading-relaxed">{p.tip}</p>
            </div>
          )}

          {/* assessment checklist */}
          {p.checklist && p.checklist.length > 0 && (
            <div>
              <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                Assessment observation checklist
              </div>
              <div className="overflow-x-auto scroll-thin rounded-lg border border-border">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-secondary text-left">
                      <th className="px-3 py-2 text-[12px] font-bold">Can-do</th>
                      <th className="w-20 px-3 py-2 text-center text-[12px] font-bold">Not yet</th>
                      <th className="w-20 px-3 py-2 text-center text-[12px] font-bold">With help</th>
                      <th className="w-20 px-3 py-2 text-center text-[12px] font-bold">Independently</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {p.checklist.map((c, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-[13px]">{c}</td>
                        <td className="px-3 py-2 text-center text-base text-muted-foreground">[ ]</td>
                        <td className="px-3 py-2 text-center text-base text-muted-foreground">[ ]</td>
                        <td className="px-3 py-2 text-center text-base text-muted-foreground">[ ]</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-1.5 text-[11.5px] text-muted-foreground">
                Tick DURING play, never as a table test. If a child freezes, observe again later. The record should show their best normal self.
              </div>
            </div>
          )}

          {/* actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                const text = buildLpText(level, weekIndex)
                navigator.clipboard
                  ?.writeText(text)
                  .then(() => toast('Lesson plan copied'))
                  .catch(() => toast('Copy not allowed here', false))
              }}
            >
              <Copy className="h-4 w-4" /> Copy as text
            </Button>
            <Button
              variant="default"
              className="flex-1 rounded-lg"
              onClick={async () => {
                try {
                  const { exportLessonPlanDoc } = await import('@/lib/export-word')
                  await exportLessonPlanDoc(level, weekIndex)
                  toast('Word document exported')
                } catch (e) {
                  toast('Export failed: ' + (e instanceof Error ? e.message : 'unknown'), false)
                }
              }}
            >
              <Download className="h-4 w-4" /> Word document
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
