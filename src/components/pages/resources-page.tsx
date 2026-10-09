'use client'

import * as React from 'react'
import { ExternalLink, Copy, FileText, CalendarDays, Pencil, Users, CheckSquare, LayoutGrid, MessageSquare, FolderOpen } from 'lucide-react'
import { useStore } from '@/lib/store'
import { libCategory, SKILLS, REPORT_STEPS, REPORT_SYSTEM_URL, REPORT_EXAMPLE } from '@/lib/constants'
import { PageHead, SectionHeader, Chip } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const SKILL_NAMES: Record<string, string> = { L: 'Listening', S: 'Speaking', R: 'Reading', W: 'Writing' }

export function ResourcesPage() {
  const state = useStore((s) => s.state)
  const toast = useStore((s) => s.toast)
  const [filter, setFilter] = React.useState<string>('') // '' | 'L' | 'S' | 'R' | 'W'

  const lib = filter ? state.library.filter((l) => (l.sk || []).includes(filter)) : state.library.slice()

  // group by category preserving LIB_CATEGORIES order, alphabetical within
  const groups: { label: string; folders: typeof lib }[] = []
  const byCat: Record<string, typeof lib> = {}
  lib.forEach((l) => {
    const cat = libCategory(l.name)
    ;(byCat[cat.label] ||= []).push(l)
  })
  // preserve category order from the constant list
  const seen = new Set<string>()
  state.library.forEach((l) => {
    const c = libCategory(l.name)
    if (!seen.has(c.label)) {
      seen.add(c.label)
      if (byCat[c.label]) groups.push({ label: c.label, folders: byCat[c.label].slice().sort((a, b) => a.name.localeCompare(b.name)) })
    }
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <PageHead
        title="Resources"
        subtitle="The Drive library and the reporting guide, open to everyone."
      />

      {/* library section */}
      <SectionHeader
        title="Library"
        right={
          <span className="text-xs font-semibold text-muted-foreground">
            {state.library.length} folders · grouped by category
          </span>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <FilterPill active={filter === ''} onClick={() => setFilter('')}>All skills</FilterPill>
        {SKILLS.map((s) => (
          <FilterPill key={s.k} active={filter === s.k} onClick={() => setFilter(s.k)}>
            {s.k} · {s.name}
          </FilterPill>
        ))}
        <span className="ml-auto text-xs font-semibold text-muted-foreground">
          {lib.length} of {state.library.length} folders
        </span>
      </div>

      {groups.map((g) => (
        <div key={g.label} className="mb-5">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {g.label}
          </div>
          <div className="grid gap-2">
            {g.folders.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noopener"
                className="flex items-start gap-3 rounded-md border border-border bg-card p-3.5 transition hover:border-primary/40"
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{l.name}</div>
                  <div className="text-sm text-muted-foreground">{l.desc}</div>
                  {(l.sk || []).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {l.sk.map((k) => (
                        <span key={k} className={cn('sk-' + k, 'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-extrabold')}>
                          {k} · {SKILL_NAMES[k]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>
      ))}

      {lib.length === 0 && (
        <div className="rounded-md border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Nothing for this skill yet · pick another skill.
        </div>
      )}

      <div className="mt-2">
        <a href={state.rootUrl || 'https://drive.google.com/'} target="_blank" rel="noopener">
          <Button variant="outline" size="sm">
            <FolderOpen className="h-3.5 w-3.5" /> Open the Drive root
          </Button>
        </a>
      </div>

      {/* reporting guide */}
      <div className="mt-8">
        <SectionHeader title="Reporting guide" />

        <div className="rounded-md border border-border bg-card p-5">
          <p className="text-sm leading-relaxed text-foreground/90">
            Every teacher, volunteer and intern files the class and session reports on the official ASO reporting site, from any phone or computer. Here is the whole path, in order:
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {REPORT_STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-3 rounded-md border border-border p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{s.t}</div>
                  <div className="text-sm text-muted-foreground">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
          <a href={REPORT_SYSTEM_URL} target="_blank" rel="noopener" className="mt-3 inline-block">
            <Button size="sm">
              <ExternalLink className="h-3.5 w-3.5" /> Open the reporting site
            </Button>
          </a>
        </div>

        {/* the form, field by field */}
        <div className="mt-4 rounded-md border border-border bg-card p-5">
          <div className="mb-2 font-bold">The report form, field by field</div>
          <p className="text-sm text-muted-foreground">
            "Send a report" on the site opens this form · fields marked * are required:
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {[
              { icon: FileText, t: 'REF-...', d: 'Auto-generated reference (REF-...-date-time). You never type it.' },
              { icon: CalendarDays, t: 'Date * · Time *', d: 'The date of the session and its time range, e.g. 11:11 · 23:49.' },
              { icon: Pencil, t: 'Topic * · Speaker *', d: 'What the session was about, and who ran it · e.g. Khalid Chellali.' },
              { icon: Users, t: 'Total audience *', d: 'Auto-filled from the "Number of attendees" of the corresponding session and cannot be changed · keep Courses Taught exact and this fills itself.' },
              { icon: CheckSquare, t: 'Type of activities *', d: 'Check all that apply: Meeting · Club · Event · Workshop · Class.' },
              { icon: LayoutGrid, t: 'Type of categories *', d: 'Check all that apply: Information about the USA · English Language Learning · Education on the U.S.A. · Alumni Activities · Community Engagement.' },
              { icon: MessageSquare, t: 'Summary text * · Drafted by *', d: 'A short honest summary of what happened, then your name.' },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-3 rounded-md border border-border p-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                  <f.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{f.t}</div>
                  <div className="text-sm text-muted-foreground">{f.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* why we report */}
        <div className="mt-4 rounded-md border border-border bg-card p-5">
          <div className="mb-1 font-bold">Why we report the same way every time</div>
          <p className="text-sm leading-relaxed text-foreground/90">
            Every session gets a short write-up, the same way, every time. Teachers report after classes; the lead intern and volunteers report after clubs and events. It takes two minutes, it keeps the coordinator in the loop without a meeting, and by June it becomes the record of the whole year: what was taught, what worked and what to fix.
          </p>
          <ol className="mt-2 space-y-0.5 text-sm leading-relaxed">
            <li>1. <b>Write it the same day</b> · details fade overnight.</li>
            <li>2. <b>Facts first</b> · name, date, who led, how many came.</li>
            <li>3. <b>Be honest in "what to change"</b> · this is how sessions improve.</li>
            <li>4. <b>One concrete step for next time</b> · never skip it.</li>
            <li>5. <b>Copy the text</b> and send it to the coordinator.</li>
          </ol>
        </div>

        {/* example */}
        <div className="mt-4 rounded-md border border-border bg-card p-5">
          <div className="mb-2 flex items-center gap-2">
            <div className="font-bold">A filled example</div>
            <Chip tone="muted">a class report, exactly as the form wants it</Chip>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => {
                navigator.clipboard?.writeText(REPORT_EXAMPLE).then(() => toast('Example copied'))
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copy example
            </Button>
          </div>
          <pre className="overflow-x-auto scroll-thin rounded-md bg-secondary p-4 text-[12.5px] leading-relaxed whitespace-pre-wrap font-mono">
            {REPORT_EXAMPLE}
          </pre>
        </div>
      </div>
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-bold transition',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-secondary text-muted-foreground hover:bg-secondary/80',
      )}
    >
      {children}
    </button>
  )
}
