'use client'

import * as React from 'react'
import { ExternalLink, Copy, Camera, FileText, CalendarDays, Pencil, Users, CheckSquare, LayoutGrid, MessageSquare, Hash } from 'lucide-react'
import { useStore } from '@/lib/store'
import { REPORT_SYSTEM_URL, REPORT_EXAMPLE_CLUB, PHOTO_FORM_URL } from '@/lib/constants'
import { Chip } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'

/* The interns' report page: they run a club session or an event, they do not take attendance, they only count how many came. */
const STEPS = [
  { icon: Hash, t: 'Count', d: 'Count how many people came. You do not take attendance, only the total number.' },
  { icon: FileText, t: 'Send the report', d: 'Open the reporting platform, sign in with your ASO number and password, choose "Send a report" and fill in the form below.' },
  { icon: Camera, t: 'Send the photos', d: 'Add the photos of the session with a short caption in the photos form.' },
]

const FIELDS = [
  { icon: FileText, t: 'REF-...', d: 'Created by the site. You never type it.' },
  { icon: CalendarDays, t: 'Date * · Time *', d: 'The date of the session and its time range.' },
  { icon: Pencil, t: 'Topic * · Speaker *', d: 'What the club or event was about, and who ran it (you).' },
  { icon: Users, t: 'Total audience *', d: 'The number of people who came, the number you counted.' },
  { icon: CheckSquare, t: 'Type of activities *', d: 'Tick Club or Event.' },
  { icon: LayoutGrid, t: 'Type of categories *', d: 'Tick what fits: Information about the USA · English Language Learning · Education on the U.S.A. · Alumni Activities · Community Engagement.' },
  { icon: MessageSquare, t: 'Summary text * · Drafted by *', d: 'A short, honest summary of what happened, then your name.' },
]

export function InternReportPage() {
  const toast = useStore((s) => s.toast)
  return (
    <div>
      <h2 className="mb-1 text-xl font-extrabold tracking-tight">Submit report</h2>
      <p className="text-sm text-muted-foreground">After every club session or event: count how many came, send your report and your photos. It takes a few minutes.</p>

      <div className="mb-6 mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-5">
        <div className="text-[15px] font-extrabold tracking-tight">After every session</div>
        <div className="mt-3 flex flex-col gap-2">
          {STEPS.map((s, i) => (
            <div key={s.t} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{s.t}</div>
                <div className="text-sm text-muted-foreground">{s.d}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={REPORT_SYSTEM_URL} target="_blank" rel="noopener">
            <Button><ExternalLink className="h-4 w-4" /> Open the reporting platform</Button>
          </a>
          {PHOTO_FORM_URL ? (
            <a href={PHOTO_FORM_URL} target="_blank" rel="noopener">
              <Button variant="outline"><Camera className="h-4 w-4" /> Open the photos form</Button>
            </a>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">The links open in a new tab. There is a quick guide on the platform if anything is unclear.</p>
      </div>

      <div className="mb-2 text-[15px] font-extrabold tracking-tight">The report form, field by field</div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">"Send a report" on the platform opens this form · fields marked * are required:</p>
        <div className="mt-3 flex flex-col gap-2">
          {FIELDS.map((f) => (
            <div key={f.t} className="flex items-start gap-3 rounded-lg border border-border p-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
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

      <div className="mb-2 mt-6 flex items-center gap-2 text-[15px] font-extrabold tracking-tight">
        <Camera className="h-4 w-4" aria-hidden /> The photos form
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">The ASO Photos Activities form asks for:</p>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
          <li><span className="font-semibold text-foreground">Full name</span> and the <span className="font-semibold text-foreground">activity</span>, picked from the list (choose Other if yours is not there)</li>
          <li>The <span className="font-semibold text-foreground">date</span> of the activity and a short <span className="font-semibold text-foreground">caption</span></li>
          <li>Up to <span className="font-semibold text-foreground">10 photos</span>, 100 MB in total</li>
        </ul>
      </div>

      <div className="mb-2 mt-6 text-[15px] font-extrabold tracking-tight">A filled example</div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="font-bold">Public Speaking Club · a club session</div>
          <Chip tone="muted" icon={FileText}>a club report, exactly as the form wants it</Chip>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => navigator.clipboard?.writeText(REPORT_EXAMPLE_CLUB).then(() => toast('Example copied'))}
          >
            <Copy className="h-3.5 w-3.5" /> Copy example
          </Button>
        </div>
        <pre className="overflow-x-auto scroll-thin rounded-lg bg-secondary p-4 text-[12.5px] leading-relaxed whitespace-pre-wrap font-mono">
          {REPORT_EXAMPLE_CLUB}
        </pre>
      </div>
    </div>
  )
}
