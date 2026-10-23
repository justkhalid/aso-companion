'use client'

import * as React from 'react'
import { Boxes, ClipboardCheck, Plug } from 'lucide-react'
import { PageHead } from '@/components/ui-bits'

const PAGES = {
  inventory: {
    title: 'Inventory',
    subtitle: 'Every book, object and material in the space, scanned into a Google Sheet.',
    icon: Boxes,
    will: ['Search and filter everything in the space by category', 'See what is available and what is checked out', 'Photo and code of each item, from the sheet', 'Items added each month, for the monthly report'],
  },
  submissions: {
    title: 'Submissions',
    subtitle: 'Who filed their report and who did not, for teachers and volunteers.',
    icon: ClipboardCheck,
    will: ['A grid of people against weeks and months: submitted, late or missing', 'Open any report to read what was submitted', 'A ready WhatsApp reminder for everyone who is missing', 'The monthly report lists who did not submit'],
  },
} as const

/* A page waiting for its Google Sheet: it says what will appear here once the sheet is connected */
export function SheetPlaceholderPage({ page }: { page: keyof typeof PAGES }) {
  const p = PAGES[page]
  const Icon = p.icon
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <PageHead title={p.title} subtitle={p.subtitle} />
      <div className="rounded-2xl border border-dashed border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground"><Icon className="h-5 w-5" aria-hidden /></span>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight">Not connected yet</h2>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Plug className="h-3.5 w-3.5" aria-hidden /> Waiting for its Google Sheet</p>
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold">What will be here:</p>
        <ul className="mt-2 grid gap-1.5 text-sm text-muted-foreground">
          {p.will.map((w) => <li key={w} className="flex gap-2"><span aria-hidden>-</span> {w}</li>)}
        </ul>
      </div>
    </div>
  )
}
