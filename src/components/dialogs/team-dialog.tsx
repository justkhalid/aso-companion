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
import { useStore } from '@/lib/store'
import { uid } from '@/lib/app-utils'
import type { TeamMember } from '@/lib/types'

export function TeamDialog({
  open,
  onOpenChange,
  member,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  member: TeamMember | null
}) {
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const isNew = !member

  const [name, setName] = React.useState('')
  const [role, setRole] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [email, setEmail] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setName(member?.name || '')
    setRole(member?.role || '')
    setPhone(member?.phone || '')
    setEmail(member?.email || '')
  }, [open, member])

  const save = () => {
    if (!name.trim()) {
      toast('Name is required', false)
      return
    }
    const entry: TeamMember = {
      id: member?.id || uid(),
      name: name.trim(),
      role: role.trim(),
      phone: phone.trim(),
      email: email.trim(),
    }
    patch((draft) => {
      if (isNew) draft.team.push(entry)
      else {
        const i = draft.team.findIndex((t) => t.id === entry.id)
        if (i >= 0) draft.team[i] = entry
      }
    })
    toast(isNew ? 'Team member added' : 'Saved')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? 'New team member' : 'Edit team member'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-name">Full name</Label>
            <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-role">Role</Label>
            <Input id="t-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Volunteer Teacher" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-phone">Phone</Label>
            <Input id="t-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-email">Email</Label>
            <Input id="t-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" className="rounded-lg" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="rounded-lg" onClick={save}>{isNew ? 'Add' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
