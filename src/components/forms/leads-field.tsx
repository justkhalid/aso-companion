'use client'

import * as React from 'react'
import { Plus, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { peopleOf } from '@/lib/app-utils'
import { joinLeads, leadNames } from '@/lib/leads'
import { NotInPeople } from '@/components/forms/not-in-people'

/* One or more leads: the chosen names as chips, and a picker (or a typed name) to add another */
export function LeadsField({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  const state = useStore((s) => s.state)
  const [typed, setTyped] = React.useState('')
  const names = leadNames(value)
  const options = Array.from(new Set(peopleOf(state).map((t) => t.name).filter(Boolean))).filter((n) => !names.some((x) => x.toLowerCase() === n.toLowerCase()))
  const add = (n: string) => { if (n.trim()) onChange(joinLeads([...names, n])); setTyped('') }
  return (
    <div className="grid gap-2">
      {names.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {names.map((n) => (
            <span key={n} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-sm font-semibold">
              {n}
              <button type="button" onClick={() => onChange(joinLeads(names.filter((x) => x !== n)))} aria-label={`Remove ${n}`} className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {options.length > 0 && (
          <select id={id} value="" onChange={(e) => add(e.target.value)} className="h-9 min-w-[10rem] flex-1 rounded-lg border border-border bg-background px-2 text-sm">
            <option value="">{names.length ? 'Add another lead' : 'Pick a lead'}</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
        <input value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(typed) } }} placeholder="or type a name" className="h-9 min-w-[8rem] flex-1 rounded-lg border border-border bg-background px-3 text-sm" />
        <button type="button" onClick={() => add(typed)} disabled={!typed.trim()} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-secondary disabled:opacity-40"><Plus className="h-4 w-4" /> Add</button>
      </div>
      {names.map((n) => <NotInPeople key={n} name={n} role="Volunteer" />)}
    </div>
  )
}
