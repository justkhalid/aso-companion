'use client'

import * as React from 'react'
import { Plus, Pencil, Trash2, Phone, Mail, Users } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHead, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { TeamDialog } from '@/components/dialogs/team-dialog'
import { initials } from '@/lib/app-utils'
import type { TeamMember } from '@/lib/types'

export function TeamPage() {
  const state = useStore((s) => s.state)
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const [dialog, setDialog] = React.useState<{ open: boolean; member: TeamMember | null }>({ open: false, member: null })

  const remove = (m: TeamMember) => {
    patch((draft) => {
      draft.team = draft.team.filter((t) => t.id !== m.id)
    })
    toast('Removed')
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <PageHead
        title="Team"
        subtitle={`${state.team.length} people · add phone numbers to enable WhatsApp`}
        right={
          <Button size="sm" onClick={() => setDialog({ open: true, member: null })}>
            <Plus className="h-4 w-4" /> Add person
          </Button>
        }
      />

      {state.team.length === 0 ? (
        <EmptyState icon={<Users className="h-5 w-5" />} title="No team members yet" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {state.team.map((t) => (
            <div key={t.id} className="rounded-md border border-border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  {initials(t.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 text-sm">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {t.phone || 'No phone yet'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {t.email || 'No email yet'}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                {t.phone && (
                  <a href={`tel:${t.phone}`}>
                    <Button variant="outline" size="sm"><Phone className="h-3.5 w-3.5" /> Call</Button>
                  </a>
                )}
                {t.email && (
                  <a href={`mailto:${t.email}`}>
                    <Button variant="outline" size="sm"><Mail className="h-3.5 w-3.5" /> Mail</Button>
                  </a>
                )}
                <div className="ml-auto flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setDialog({ open: true, member: t })} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(t)} title="Remove">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <TeamDialog open={dialog.open} onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))} member={dialog.member} />
    </div>
  )
}
