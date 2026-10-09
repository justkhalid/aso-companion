'use client'

import * as React from 'react'
import { Plus, Pencil, Trash2, Phone, Mail, Users } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHead, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { VolunteerDialog } from '@/components/dialogs/volunteer-dialog'
import type { Volunteer } from '@/lib/types'

export function InternVolunteersPage() {
  const state = useStore((s) => s.state)
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const [dialog, setDialog] = React.useState<{ open: boolean; v: Volunteer | null }>({ open: false, v: null })

  const remove = (v: Volunteer) => {
    patch((draft) => {
      draft.volunteers = draft.volunteers.filter((x) => x.id !== v.id)
    })
    toast('Volunteer removed')
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <PageHead
        title="Volunteers"
        subtitle={`${state.volunteers.length} volunteers`}
        right={
          <Button size="sm" onClick={() => setDialog({ open: true, v: null })}>
            <Plus className="h-4 w-4" /> Add volunteer
          </Button>
        }
      />
      {state.volunteers.length === 0 ? (
        <EmptyState icon={<Users className="h-5 w-5" />} title="No volunteers yet" hint="Add your first volunteer." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {state.volunteers.map((v) => (
            <div key={v.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-2">
                <div className="font-bold">{v.name}</div>
                <div className="text-xs text-muted-foreground">{v.role}</div>
              </div>
              <div className="flex flex-col gap-1.5 text-sm">
                <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {v.phone || 'No phone'}</span>
                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {v.email || 'No email'}</span>
                {v.aso && <span className="text-xs text-muted-foreground">ASO number: {v.aso}</span>}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                {v.phone && (
                  <a href={`tel:${v.phone}`}><Button variant="outline" size="sm"><Phone className="h-3.5 w-3.5" /> Call</Button></a>
                )}
                {v.email && (
                  <a href={`mailto:${v.email}`}><Button variant="outline" size="sm"><Mail className="h-3.5 w-3.5" /> Mail</Button></a>
                )}
                <div className="ml-auto flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setDialog({ open: true, v })} title="Edit"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(v)} title="Remove"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <VolunteerDialog open={dialog.open} onOpenChange={(v2) => setDialog((s) => ({ ...s, open: v2 }))} volunteer={dialog.v} />
    </div>
  )
}
