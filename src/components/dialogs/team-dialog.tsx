'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown } from 'lucide-react'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useStore } from '@/lib/store'
import { PEOPLE_ROLES, rolesOf, uid } from '@/lib/app-utils'
import { cn } from '@/lib/utils'
import type { TeamMember } from '@/lib/types'

/* one form for everybody at ASO: pick every role the person holds */
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
  const [roles, setRoles] = React.useState<string[]>([])
  const [other, setOther] = React.useState('')
  const state = useStore((s) => s.state)
  const [duty, setDuty] = React.useState('')
  const [looks, setLooks] = React.useState<string[]>([])
  const [phone, setPhone] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [aso, setAso] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    const all = member ? rolesOf(member) : []
    setName(member?.name || '')
    setRoles(all.filter((r) => (PEOPLE_ROLES as readonly string[]).includes(r)))
    setOther(all.filter((r) => !(PEOPLE_ROLES as readonly string[]).includes(r)).join(', '))
    setDuty(member?.duty || '')
    setLooks(member?.looksAfter ?? [])
    setPhone(member?.phone || '')
    setEmail(member?.email || '')
    setAso(member?.aso || '')
  }, [open, member?.id])

  const looksGroups = [
    { label: 'Classes', items: (state.classes || []).map((c) => c.code).filter(Boolean) },
    { label: 'Clubs', items: (state.clubs || []).filter((c) => !c.placeholder).map((c) => c.name) },
    { label: 'Events', items: (state.events || []).map((e) => e.title).filter(Boolean) },
  ]
  const toggle = (r: string) => setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]))

  const save = () => {
    if (!name.trim()) {
      toast('Name is required', false)
      return
    }
    const all = [...roles, ...other.split(',').map((x) => x.trim()).filter(Boolean)]
    const entry: TeamMember = {
      id: member?.id || uid(),
      name: name.trim(),
      roles: all,
      role: all.join(' + '),
      looksAfter: looks.length ? looks : undefined,
      duty: duty.trim() || undefined,
      phone: phone.trim(),
      email: email.trim(),
      aso: aso.trim() || undefined,
    }
    patch((draft) => {
      if (isNew) draft.team.push(entry)
      else {
        const i = draft.team.findIndex((t) => t.id === entry.id)
        if (i >= 0) draft.team[i] = entry
      }
    })
    toast(isNew ? 'Person added' : 'Saved')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? 'New person' : 'Edit person'}</DialogTitle>
          <DialogDescription>Choose every role this person holds. They show up once, under each role.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-name">Full name</Label>
            <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Roles</legend>
            <div className="flex flex-wrap gap-1.5">
              {PEOPLE_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={roles.includes(r)}
                  onClick={() => toggle(r)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    roles.includes(r) ? 'aso-nav-pill border-transparent' : 'border-border bg-secondary text-foreground/80 hover:bg-secondary/70',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <Input aria-label="Other roles, separated by commas" value={other} onChange={(e) => setOther(e.target.value)} placeholder="Other roles, separated by commas" />
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <Label id="t-looks-label">Looks after</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" aria-labelledby="t-looks-label" className="h-auto min-h-9 justify-between gap-2 py-2 text-left font-normal">
                  <span className="min-w-0 flex-1 whitespace-normal">
                    {looks.length ? looks.join(', ') : <span className="text-muted-foreground">Choose classes, clubs or events</span>}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto">
                {looksGroups.every((g) => g.items.length === 0) && <div className="px-2 py-1.5 text-sm text-muted-foreground">No classes, clubs or events yet</div>}
                {looksGroups.map((g, gi) =>
                  g.items.length ? (
                    <React.Fragment key={g.label}>
                      {gi > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{g.label}</DropdownMenuLabel>
                      {g.items.map((it) => (
                        <DropdownMenuCheckboxItem
                          key={it}
                          checked={looks.includes(it)}
                          onSelect={(e) => e.preventDefault()}
                          onCheckedChange={(v) => setLooks((cur) => (v ? [...cur, it] : cur.filter((x) => x !== it)))}
                        >
                          {it}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </React.Fragment>
                  ) : null,
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Input aria-label="Other responsibilities" value={duty} onChange={(e) => setDuty(e.target.value)} placeholder="Anything else, for example: program decisions" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-phone">Phone</Label>
              <Input id="t-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-email">Email</Label>
              <Input id="t-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-aso">ASO number</Label>
            <Input id="t-aso" value={aso} onChange={(e) => setAso(e.target.value)} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" className="rounded-lg" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="rounded-lg">{isNew ? 'Add' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
