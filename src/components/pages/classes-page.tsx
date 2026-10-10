'use client'

import * as React from 'react'
import { Plus, Clock, CalendarDays, Home, Users } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHead, EmptyState, Chip } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { ClassDialog } from '@/components/dialogs/class-dialog'
import { RowActions } from '@/components/admin/row-actions'
import { uid, fmtTime } from '@/lib/app-utils'
import type { ClassEntry } from '@/lib/types'

export function ClassesPage() {
  const state = useStore((s) => s.state)
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)

  const [dialog, setDialog] = React.useState<{ open: boolean; cls: ClassEntry | null }>({ open: false, cls: null })

  const duplicate = (c: ClassEntry) => {
    const copy = { ...c, id: uid(), code: c.code + ' copy' }
    patch((d) => { d.classes.push(copy) })
    setDialog({ open: true, cls: copy })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <PageHead
        title="Classes"
        subtitle={`${state.classes.length} groups · ${state.settings.year}`}
        right={
          <Button size="sm" onClick={() => setDialog({ open: true, cls: null })}>
            <Plus className="h-4 w-4" /> Add class
          </Button>
        }
      />

      {state.classes.length === 0 ? (
        <EmptyState icon={<Users className="h-5 w-5" />} title="No classes yet" hint="Add your first group." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {state.classes.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex-1 font-bold">{c.code}</div>
                <Chip tone="primary">{c.level}</Chip>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {fmtTime(c.time) || '-'}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" /> {(c.days || []).join(' · ') || '-'}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Home className="h-3.5 w-3.5" /> {c.room || '-'}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-foreground" />
                <span className="text-sm font-semibold">{c.teacher || '-'}</span>
                <div className="ml-auto">
                  <RowActions
                    name={c.code}
                    onEdit={() => setDialog({ open: true, cls: c })}
                    onDuplicate={() => duplicate(c)}
                    remove={(d) => { d.classes = d.classes.filter((x) => x.id !== c.id) }}
                    deleteNote="The class card is removed. Weeks and team are not affected."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ClassDialog open={dialog.open} onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))} cls={dialog.cls} />

    </div>
  )
}
