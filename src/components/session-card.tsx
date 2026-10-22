'use client'

import * as React from 'react'
import { Send, User } from 'lucide-react'
import { PosterThumb } from '@/components/poster-thumb'
import { RowActions } from '@/components/admin/row-actions'
import { Button } from '@/components/ui/button'
import { leadNames } from '@/lib/leads'
import { cn } from '@/lib/utils'
import type { State } from '@/lib/types'

/* One card for a club and for an event: poster on the left, the facts in a column on the right, one clear action row at the bottom */
export function SessionCard({
  kind, title, poster, icon, badge, desc, meta, lead, archived, onPost, onEdit, onDuplicate, remove, extraMenu, deleteNote,
}: {
  kind: 'club' | 'event'
  title: string
  poster?: string
  icon?: string
  badge?: React.ReactNode
  desc?: string
  meta: { icon: React.ElementType; text: React.ReactNode }[]
  lead?: string
  archived?: boolean
  onPost: () => void
  onEdit: () => void
  onDuplicate: () => void
  remove: (d: State) => void
  extraMenu?: React.ReactNode
  deleteNote?: string
}) {
  const leads = leadNames(lead)
  return (
    <div className={cn('flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm', archived && 'opacity-75')}>
      <PosterThumb poster={poster} alt={`${title} poster`} icon={icon} kind={kind} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
          <h3 className="min-w-0 flex-1 text-[17px] font-extrabold leading-tight tracking-tight" dir="auto">{title}</h3>
          {badge}
        </div>
        {desc && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground" dir="auto">{desc}</p>}
        <ul className="mt-3 grid gap-1.5 text-[13px] font-semibold text-muted-foreground">
          {meta.map((m, i) => (
            <li key={i} className="flex items-center gap-2"><m.icon className="h-4 w-4 shrink-0" aria-hidden /> <span className="min-w-0 break-words">{m.text}</span></li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          {leads.length ? leads.map((n) => <span key={n} className="rounded-full bg-secondary px-2.5 py-0.5 text-[13px] font-semibold">{n}</span>) : <span className="text-[13px] font-semibold text-[var(--aso-gold)]">Needs a lead</span>}
        </div>
        <div className="mt-auto pt-4"><div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          {archived ? <span className="text-xs font-semibold text-muted-foreground">Archived</span> : <Button size="sm" onClick={onPost}><Send className="h-3.5 w-3.5" /> Share</Button>}
          <RowActions name={title} onEdit={onEdit} onDuplicate={onDuplicate} remove={remove} extra={extraMenu} deleteNote={deleteNote} />
        </div></div>
      </div>
    </div>
  )
}

/* upcoming on top, what is over below under "Archive" */
export function ArchiveGroup({ count, children }: { count: number; children: React.ReactNode }) {
  if (!count) return null
  return (
    <details className="mt-8 group">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl bg-secondary/70 px-4 py-2.5 text-sm font-extrabold tracking-tight">
        Archive <span className="rounded-full bg-background px-2 py-0.5 text-xs font-bold text-muted-foreground">{count}</span>
        <span className="ml-auto text-xs font-semibold text-muted-foreground group-open:hidden">Show</span>
        <span className="ml-auto hidden text-xs font-semibold text-muted-foreground group-open:inline">Hide</span>
      </summary>
      <div className="mt-3 grid gap-3">{children}</div>
    </details>
  )
}
