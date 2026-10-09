'use client'

import * as React from 'react'
import { ExternalLink, Copy, FileText, CalendarDays, Pencil, Users, CheckSquare, LayoutGrid, MessageSquare } from 'lucide-react'
import { useStore } from '@/lib/store'
import { REPORT_STEPS, REPORT_SYSTEM_URL, REPORT_EXAMPLE } from '@/lib/constants'
import { PageHead, Chip } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'

export function ReportsPage() {
  const toast = useStore((s) => s.toast)
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <PageHead title="Reports" subtitle="How reporting works at ASO: the official system, the form, and one real example." />

      <div className="mb-2 text-[15px] font-extrabold tracking-tight">The official reporting system</div>
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
          <Button size="sm"><ExternalLink className="h-3.5 w-3.5" /> Open the reporting site</Button>
        </a>
      </div>

      <div className="mb-2 mt-6 text-[15px] font-extrabold tracking-tight">The report form, field by field</div>
      <div className="rounded-md border border-border bg-card p-5">
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

      <div className="mb-2 mt-6 text-[15px] font-extrabold tracking-tight">A filled example</div>
      <div className="rounded-md border border-border bg-card p-5">
        <div className="mb-2 flex items-center gap-2">
          <div className="font-bold">Kids · Beginners · W3 Colors · filed on the reporting site</div>
          <Chip tone="muted">a class report, exactly as the form wants it</Chip>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => navigator.clipboard?.writeText(REPORT_EXAMPLE).then(() => toast('Example copied'))}
          >
            <Copy className="h-3.5 w-3.5" /> Copy example
          </Button>
        </div>
        <pre className="overflow-x-auto scroll-thin rounded-md bg-secondary p-4 text-[12.5px] leading-relaxed whitespace-pre-wrap font-mono">
          {REPORT_EXAMPLE}
        </pre>
      </div>
    </div>
  )
}
