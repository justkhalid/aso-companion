'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStore } from '@/lib/store'
import type { Level, Week, LessonPlan } from '@/lib/types'

export function WeekDialog({
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
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)

  const [theme, setTheme] = React.useState('')
  const [obj, setObj] = React.useState('')
  const [lang, setLang] = React.useState('')
  const [res, setRes] = React.useState('')
  const [urls, setUrls] = React.useState('')
  const [act, setAct] = React.useState('')
  const [hw, setHw] = React.useState('')
  const [skills, setSkills] = React.useState({ L: '', S: '', R: '', W: '' })
  const [lpOpen, setLpOpen] = React.useState(false)
  const [lp, setLp] = React.useState<LessonPlan | null>(null)

  React.useEffect(() => {
    if (!open || !level) return
    const w: Week | undefined = level.weeks[weekIndex]
    setTheme(w?.theme || '')
    setObj(w?.obj || '')
    setLang(w?.lang || '')
    setRes(w?.res || '')
    setUrls((w?.urls || []).join('\n'))
    setAct(w?.act || '')
    setHw(w?.hw || '')
    setSkills(w?.skills || { L: '', S: '', R: '', W: '' })
    setLp(w?.lp ? JSON.parse(JSON.stringify(w.lp)) : null)
    setLpOpen(false)
  }, [open, level?.key, weekIndex])

  if (!level) return null

  const save = () => {
    const newWeek: Week = {
      theme: theme.trim(),
      obj: obj.trim(),
      lang: lang.trim(),
      res: res.trim(),
      urls: urls.split('\n').map((s) => s.trim()).filter(Boolean),
      act: act.trim(),
      hw: hw.trim(),
      skills,
      ...(lp ? { lp } : {}),
    }
    patch((draft) => {
      const lv = draft.levels.find((l) => l.key === level.key)
      if (!lv) return
      if (weekIndex >= 0 && weekIndex < lv.weeks.length) lv.weeks[weekIndex] = newWeek
      else lv.weeks.push(newWeek)
    })
    toast('Week saved')
    onOpenChange(false)
  }

  const setSkill = (k: 'L' | 'S' | 'R' | 'W', v: string) =>
    setSkills((s) => ({ ...s, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl scroll-thin">
        <DialogHeader>
          <DialogTitle>
            Edit week {weekIndex >= 0 ? weekIndex + 1 : level.weeks.length + 1} · {level.label}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wk-theme">Theme</Label>
            <Input id="wk-theme" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Week theme" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wk-obj">Objectives (students can...)</Label>
            <Textarea id="wk-obj" value={obj} onChange={(e) => setObj(e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wk-lang">Key language</Label>
              <Textarea id="wk-lang" value={lang} onChange={(e) => setLang(e.target.value)} rows={2} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wk-res">Resources</Label>
              <Textarea id="wk-res" value={res} onChange={(e) => setRes(e.target.value)} rows={2} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wk-urls">Drive links (one per line)</Label>
            <Textarea id="wk-urls" value={urls} onChange={(e) => setUrls(e.target.value)} rows={2} placeholder="https://drive.google.com/..." />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wk-act">Activities</Label>
            <Textarea id="wk-act" value={act} onChange={(e) => setAct(e.target.value)} rows={2} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wk-hw">Homework</Label>
            <Textarea id="wk-hw" value={hw} onChange={(e) => setHw(e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(['L', 'S', 'R', 'W'] as const).map((k) => (
              <div key={k} className="flex flex-col gap-1.5">
                <Label htmlFor={`wk-sk-${k}`}>{k} · {k === 'L' ? 'Listening' : k === 'S' ? 'Speaking' : k === 'R' ? 'Reading' : 'Writing'}</Label>
                <Textarea
                  id={`wk-sk-${k}`}
                  value={skills[k]}
                  onChange={(e) => setSkill(k, e.target.value)}
                  rows={2}
                />
              </div>
            ))}
          </div>

          {/* lesson plan editor (advanced, collapsible) */}
          <div className="rounded-lg border border-border">
            <button
              onClick={() => setLpOpen((o) => !o)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-bold"
            >
              <span className="flex-1">Lesson plan (detailed, optional)</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {lp ? 'set' : 'none'} · {lpOpen ? 'hide' : 'edit'}
              </span>
            </button>
            {lpOpen && (
              <LessonPlanEditor lp={lp} setLp={setLp} />
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" className="rounded-lg" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="rounded-lg" onClick={save}>Save week</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LessonPlanEditor({
  lp,
  setLp,
}: {
  lp: LessonPlan | null
  setLp: (lp: LessonPlan | null) => void
}) {
  const ensure = (): LessonPlan =>
    lp || {
      wu: '', pres: '', prac: '', ls: '', re: '', prod: '', rw: '', st: '',
      g: [], diff: [], hw: [], tip: '',
    }
  const upd = (fn: (p: LessonPlan) => void) => {
    const p = ensure()
    fn(p)
    setLp({ ...p })
  }

  const gamesText = (lp?.g || []).map((g) => `${g[0]}: ${g[1]}`).join('\n')
  const setGames = (text: string) => {
    upd((p) => {
      p.g = text
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((line) => {
          const i = line.indexOf(':')
          if (i < 0) return [line, ''] as [string, string]
          return [line.slice(0, i).trim(), line.slice(i + 1).trim()] as [string, string]
        })
    })
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
      {([
        ['wu', 'Warm-up review'],
        ['pres', 'Presentation'],
        ['prac', 'Practice (guided)'],
        ['ls', 'Listening slot'],
        ['re', 'Reactivation game'],
        ['prod', 'Production task'],
        ['rw', 'Reading & writing'],
        ['st', 'Story / song + goodbye'],
      ] as [keyof LessonPlan, string][]).map(([k, label]) => (
        <div key={k as string} className="flex flex-col gap-1">
          <Label className="text-xs font-bold">{label}</Label>
          <Textarea
            rows={2}
            value={String((lp as unknown as Record<string, unknown>)?.[k as string] ?? '')}
            onChange={(e) => upd((p) => { (p as unknown as Record<string, string>)[k as string] = e.target.value })}
          />
        </div>
      ))}
      <div className="flex flex-col gap-1">
        <Label className="text-xs font-bold">Games (one per line: Name: description)</Label>
        <Textarea rows={3} value={gamesText} onChange={(e) => setGames(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs font-bold">Differentiation (one per line)</Label>
        <Textarea
          rows={2}
          value={(lp?.diff || []).join('\n')}
          onChange={(e) => upd((p) => { p.diff = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs font-bold">Homework options (one per line)</Label>
        <Textarea
          rows={2}
          value={(lp?.hw || []).join('\n')}
          onChange={(e) => upd((p) => { p.hw = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs font-bold">Teacher tip</Label>
        <Textarea
          rows={2}
          value={lp?.tip || ''}
          onChange={(e) => upd((p) => { p.tip = e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs font-bold">Assessment checklist (one per line, optional)</Label>
        <Textarea
          rows={2}
          value={(lp?.checklist || []).join('\n')}
          onChange={(e) => upd((p) => { p.checklist = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
        />
      </div>
      <div className="flex justify-end">
        <button
          className="text-xs font-bold text-destructive"
          onClick={() => setLp(null)}
        >
          Remove lesson plan
        </button>
      </div>
    </div>
  )
}
