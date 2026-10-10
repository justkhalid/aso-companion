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
import { SkillPicker } from '@/components/forms/form-controls'
import { useStore } from '@/lib/store'
import { uid } from '@/lib/app-utils'
import { LIB_GROUPS, libGroup } from '@/lib/constants'
import type { LibBand, LibraryFolder } from '@/lib/types'

export function LibraryDialog({
  open,
  onOpenChange,
  folder,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  folder: LibraryFolder | null
}) {
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const isNew = !folder

  const [name, setName] = React.useState('')
  const [desc, setDesc] = React.useState('')
  const [url, setUrl] = React.useState('')
  const [sk, setSk] = React.useState<string[]>([])
  const [cat, setCat] = React.useState('')
  const [bands, setBands] = React.useState<LibBand[]>([])

  React.useEffect(() => {
    if (!open) return
    setName(folder?.name || '')
    setDesc(folder?.desc || '')
    setUrl(folder?.url || '')
    setSk(folder?.sk || [])
    setCat(folder?.cat || (folder ? libGroup(folder).k : ''))
    setBands(folder?.bands || [])
  }, [open, folder])

  const save = () => {
    if (!name.trim()) {
      toast('Give the folder a name', false)
      return
    }
    if (!url.trim()) {
      toast('Add the Drive link', false)
      return
    }
    const entry: LibraryFolder = {
      id: folder?.id || uid(),
      name: name.trim(),
      desc: desc.trim(),
      url: url.trim(),
      sk,
      cat: cat || undefined,
      bands: bands.length ? bands : undefined,
    }
    patch((draft) => {
      if (isNew) draft.library.push(entry)
      else {
        const i = draft.library.findIndex((l) => l.id === entry.id)
        if (i >= 0) draft.library[i] = entry
      }
    })
    toast(isNew ? 'Folder added' : 'Folder saved')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add library folder' : 'Edit library folder'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="l-name">Name</Label>
            <Input id="l-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Lesson Plans" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="l-desc">Description</Label>
            <Textarea id="l-desc" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="l-url">Drive link</Label>
            <Input id="l-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/..." />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="l-cat">Group</Label>
            <select
              id="l-cat"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Choose automatically</option>
              {LIB_GROUPS.map((g) => (
                <option key={g.k} value={g.k}>{g.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Ages (leave empty for all)</Label>
            <div className="flex gap-1.5">
              {(['Kids', 'Teens', 'Adults'] as LibBand[]).map((b) => (
                <Button
                  key={b}
                  type="button"
                  size="sm"
                  variant={bands.includes(b) ? 'default' : 'outline'}
                  onClick={() => setBands((cur) => (cur.includes(b) ? cur.filter((x) => x !== b) : cur.concat(b)))}
                >
                  {b}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Skill tags (only the skills it really trains)</Label>
            <SkillPicker value={sk} onChange={setSk} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" className="rounded-lg" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="rounded-lg" onClick={save}>{isNew ? 'Add folder' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
