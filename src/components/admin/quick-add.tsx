'use client'

import * as React from 'react'
import { Plus, GraduationCap, Sparkles, CalendarDays, UserX, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ClassDialog } from '@/components/dialogs/class-dialog'
import { ClubDialog } from '@/components/dialogs/club-dialog'
import { EventDialog } from '@/components/dialogs/event-dialog'
import { AbsenceDialog } from '@/components/dialogs/absence-dialog'
import { TeamDialog } from '@/components/dialogs/team-dialog'

export type QuickKind = 'absence' | 'class' | 'club' | 'event' | 'team'

const ITEMS: { kind: QuickKind; label: string; icon: React.ElementType }[] = [
  { kind: 'absence', label: 'Absence', icon: UserX },
  { kind: 'class', label: 'Class', icon: GraduationCap },
  { kind: 'club', label: 'Club', icon: Sparkles },
  { kind: 'event', label: 'Event', icon: CalendarDays },
  { kind: 'team', label: 'Person', icon: Users },
]

const EVT = 'aso-quick-add'

/** open the "new ..." form for something from anywhere (a dashboard button, a menu) */
export function openQuickAdd(kind: QuickKind) {
  window.dispatchEvent(new CustomEvent(EVT, { detail: kind }))
}

/* the "+ New" menu in the admin top bar; it also hosts the forms so any page can open them */
export function QuickAdd() {
  const [kind, setKind] = React.useState<QuickKind | null>(null)
  React.useEffect(() => {
    const on = (e: Event) => setKind((e as CustomEvent<QuickKind>).detail)
    window.addEventListener(EVT, on)
    return () => window.removeEventListener(EVT, on)
  }, [])
  const close = (v: boolean) => { if (!v) setKind(null) }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="rounded-full" aria-label="Add something new">
            <Plus className="h-4 w-4" aria-hidden /> New
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {ITEMS.map((it) => (
            <DropdownMenuItem key={it.kind} onSelect={() => setKind(it.kind)}>
              <it.icon className="h-4 w-4" aria-hidden /> {it.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <AbsenceDialog open={kind === 'absence'} onOpenChange={close} absence={null} />
      <ClassDialog open={kind === 'class'} onOpenChange={close} cls={null} />
      <ClubDialog open={kind === 'club'} onOpenChange={close} club={null} />
      <EventDialog open={kind === 'event'} onOpenChange={close} event={null} />
      <TeamDialog open={kind === 'team'} onOpenChange={close} member={null} />
    </>
  )
}
