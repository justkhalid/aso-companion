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
import type { Volunteer } from '@/lib/types'

export function VolunteerDialog({
  open,
  onOpenChange,
  volunteer,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  volunteer: Volunteer | null
}) {
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const isNew = !volunteer

  const [name, setName] = React.useState('')
  const [role, setRole] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [aso, setAso] = React.useState('')
  const [email, setEmail] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setName(volunteer?.name || '')
    setRole(volunteer?.role || '')
    setPhone(volunteer?.phone || '')
    setAso(volunteer?.aso || '')
    setEmail(volunteer?.email || '')
  }, [open, volunteer?.id])

  const save = () => {
    if (!name.trim()) {
      toast('Name is required', false)
      return
    }
    const entry: Volunteer = {
      id: volunteer?.id || uid(),
      name: name.trim(),
      role: role.trim(),
      phone: phone.trim(),
      aso: aso.trim(),
      email: email.trim(),
    }
    patch((draft) => {
      if (isNew) draft.volunteers.push(entry)
      else {
        const i = draft.volunteers.findIndex((v) => v.id === entry.id)
        if (i >= 0) draft.volunteers[i] = entry
      }
    })
    toast(isNew ? 'Volunteer added' : 'Volunteer saved')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? 'New volunteer' : 'Edit volunteer'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-name">Full name</Label>
            <Input id="v-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-role">Role</Label>
            <Input id="v-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Club volunteer" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="v-phone">WhatsApp phone</Label>
              <Input id="v-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 xx xx xx xx" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="v-aso">ASO number</Label>
              <Input id="v-aso" value={aso} onChange={(e) => setAso(e.target.value)} placeholder="10234" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-email">Email</Label>
            <Input id="v-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" className="rounded-lg" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="rounded-lg" onClick={save}>{isNew ? 'Add volunteer' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
