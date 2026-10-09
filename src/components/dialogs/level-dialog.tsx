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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import type { Level } from '@/lib/types'

const BANDS = ['Kids', 'Teens', 'Adults', ''] as const
const TIERS = ['Beginners', 'Intermediate', 'Advanced', ''] as const

export function LevelDialog({
  open,
  onOpenChange,
  level,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  level: Level
}) {
  const patch = useStore((s) => s.patch)
  const setView = useStore((s) => s.setView)
  const toast = useStore((s) => s.toast)

  const [label, setLabel] = React.useState('')
  const [cefr, setCefr] = React.useState('')
  const [band, setBand] = React.useState<string>('')
  const [tier, setTier] = React.useState<string>('')
  const [desc, setDesc] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setLabel(level.label)
    setCefr(level.cefr)
    setBand(level.band || '')
    setTier(level.tier || '')
    setDesc(level.desc || '')
  }, [open, level])

  const save = () => {
    patch((draft) => {
      const lv = draft.levels.find((l) => l.key === level.key)
      if (!lv) return
      lv.label = label.trim()
      lv.cefr = cefr.trim()
      lv.band = band as Level['band']
      lv.tier = tier
      lv.desc = desc.trim()
    })
    toast('Level saved')
    onOpenChange(false)
  }

  const remove = () => {
    patch((draft) => {
      draft.levels = draft.levels.filter((l) => l.key !== level.key)
    })
    toast('Level removed')
    onOpenChange(false)
    setView('eltaso')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename / remove level</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lv-label">Level name</Label>
            <Input id="lv-label" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lv-cefr">CEFR</Label>
              <Input id="lv-cefr" value={cefr} onChange={(e) => setCefr(e.target.value)} placeholder="A1" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Band</Label>
              <Select value={band} onValueChange={setBand}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pick" /></SelectTrigger>
                <SelectContent>
                  {BANDS.map((b) => (
                    <SelectItem key={b || 'none'} value={b}>{b || 'No band'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Tier</Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Pick" /></SelectTrigger>
              <SelectContent>
                {TIERS.map((t) => (
                  <SelectItem key={t || 'none'} value={t}>{t || 'No tier'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lv-desc">General description</Label>
            <Textarea id="lv-desc" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <Button variant="ghost" className="rounded-lg text-destructive" onClick={remove}>
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" className="rounded-lg" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="rounded-lg" onClick={save}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
