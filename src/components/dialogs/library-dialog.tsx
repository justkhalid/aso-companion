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
import type { LibraryFolder } from '@/lib/types'

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

  React.useEffect(() => {
    if (!open) return
    setName(folder?.name || '')
    setDesc(folder?.desc || '')
    setUrl(folder?.url || '')
    setSk(folder?.sk || [])
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
            <Label>Skill tags</Label>
            <SkillPicker value={sk} onChange={setSk} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>{isNew ? 'Add folder' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
