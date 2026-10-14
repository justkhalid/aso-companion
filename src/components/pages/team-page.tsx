'use client'

import * as React from 'react'
import { Plus, Phone, Mail, Users, Search, GraduationCap, HeartHandshake } from 'lucide-react'
import { useStore } from '@/lib/store'
import { heldBy, legacyLooks } from '@/lib/leads'
import { PageHead, EmptyState, Chip } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TeamDialog } from '@/components/dialogs/team-dialog'
import { RowActions } from '@/components/admin/row-actions'
import { initials, peopleOf, rolesOf, PEOPLE_ROLES } from '@/lib/app-utils'
import { cn } from '@/lib/utils'
import type { TeamMember } from '@/lib/types'

/* everybody at ASO in one list; filter by role, a person with two roles shows under both */
export function TeamPage() {
  const state = useStore((s) => s.state)
  const [dialog, setDialog] = React.useState<{ open: boolean; member: TeamMember | null }>({ open: false, member: null })
  const [filter, setFilter] = React.useState<string>('All')
  const [q, setQ] = React.useState('')

  const people = peopleOf(state)
  const extraRoles = Array.from(new Set(people.flatMap(rolesOf))).filter((r) => !(PEOPLE_ROLES as readonly string[]).includes(r))
  const filters = ['All', ...PEOPLE_ROLES.filter((r) => people.some((p) => rolesOf(p).includes(r))), ...extraRoles]
  const shown = people
    .filter((p) => filter === 'All' || rolesOf(p).includes(filter))
    .filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))
  const count = (f: string) => (f === 'All' ? people.length : people.filter((p) => rolesOf(p).includes(f)).length)

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <PageHead
        title="People"
        subtitle={`${people.length} people · teachers, interns, volunteers and staff in one list`}
        right={
          <Button size="sm" onClick={() => setDialog({ open: true, member: null })}>
            <Plus className="h-4 w-4" /> Add person
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div role="group" aria-label="Filter by role" className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                filter === f ? 'aso-nav-pill shadow-sm' : 'bg-secondary text-foreground/80 hover:bg-secondary/70',
              )}
            >
              {f} <span className="opacity-70">{count(f)}</span>
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Search people by name" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="pl-9" />
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<Users className="h-5 w-5" />} title={people.length ? 'Nobody matches' : 'No people yet'} hint={people.length ? 'Try another role or clear the search.' : 'Add the first person with the button above.'} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary" aria-hidden>
                  {initials(t.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{t.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {rolesOf(t).length ? rolesOf(t).map((r) => <Chip key={r} tone={r === 'Teacher' ? 'primary' : r === 'Volunteer' ? 'gold' : undefined} icon={r === 'Teacher' ? GraduationCap : r === 'Volunteer' ? HeartHandshake : Users}>{r}</Chip>) : <span className="text-xs text-muted-foreground">No role yet</span>}
                  </div>
                </div>
                <RowActions
                  name={t.name}
                  onEdit={() => setDialog({ open: true, member: t })}
                  remove={(d) => {
                    d.team = d.team.filter((x) => x.id !== t.id)
                    d.volunteers = (d.volunteers || []).filter((x) => x.id !== t.id)
                  }}
                />
              </div>
              {(() => {
                const items = [...heldBy(state, t.name).map((h) => (h.role === 'helps' ? `${h.label} (helps)` : h.label)), ...legacyLooks(state, t.name, t.looksAfter), t.duty].filter(Boolean)
                return items.length > 0 ? <div className="mb-1.5 text-sm text-foreground/80"><span className="font-semibold">Looks after:</span> {items.join(', ')}</div> : null
              })()}
              <div className="flex flex-col gap-1.5 text-sm">
                <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /> {t.phone || 'No phone yet'}</span>
                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /> {t.email || 'No email yet'}</span>
                {t.aso && <span className="text-xs text-muted-foreground">ASO number: {t.aso}</span>}
              </div>
              {(t.phone || t.email) && (
                <div className="mt-2 flex gap-1.5">
                  {t.phone && <a href={`tel:${t.phone}`}><Button variant="outline" size="sm"><Phone className="h-3.5 w-3.5" /> Call</Button></a>}
                  {t.email && <a href={`mailto:${t.email}`}><Button variant="outline" size="sm"><Mail className="h-3.5 w-3.5" /> Mail</Button></a>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <TeamDialog open={dialog.open} onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))} member={dialog.member} />
    </div>
  )
}
