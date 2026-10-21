'use client'

import * as React from 'react'
import { CalendarX2, ChevronLeft, ChevronRight, FileDown, Loader2, Send, UserX } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHead } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { buildReportData, monthKey } from '@/lib/month-report'
import type { MonthReport } from '@/lib/types'
import { cn } from '@/lib/utils'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const area = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary'

/* The monthly report: the numbers come from the calendar, the director adds the words and the head counts, then exports a Word document */
export function MonthReportPage() {
  const state = useStore((s) => s.state)
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const now = new Date()
  /* before the 10th the report most people want is the one of last month */
  const start = now.getDate() < 10 ? new Date(now.getFullYear(), now.getMonth() - 1, 1) : now
  const [year, setYear] = React.useState(start.getFullYear())
  const [month, setMonth] = React.useState(start.getMonth())
  const key = monthKey(year, month)
  const saved = state.monthReports?.[key]
  const [draft, setDraft] = React.useState<MonthReport>(() => saved || {})
  const [busy, setBusy] = React.useState(false)
  const [joined, setJoined] = React.useState<number | null>(null)

  /* another month: take what was saved for it */
  React.useEffect(() => { setDraft(state.monthReports?.[key] || {}) }, [key])

  const data = React.useMemo(() => buildReportData(state, year, month), [state, year, month])

  /* new library members that month, when the members sheet is connected on this computer */
  React.useEffect(() => {
    let live = true
    setJoined(null)
    fetch('/api/members?month=' + key, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { joined?: number } | null) => { if (live && j && typeof j.joined === 'number') setJoined(j.joined) })
      .catch(() => {})
    return () => { live = false }
  }, [key])

  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const change = (fn: (d: MonthReport) => MonthReport) => {
    setDraft((d) => {
      const n = fn(d)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => patch((s) => { s.monthReports = { ...(s.monthReports || {}), [key]: n } }), 900)
      return n
    })
  }
  const item = (k: string, f: 'attendance' | 'note', v: string) =>
    change((d) => ({ ...d, items: { ...(d.items || {}), [k]: { ...(d.items?.[k] || {}), [f]: f === 'attendance' ? (v === '' ? undefined : Math.max(0, Math.round(+v))) : v } } }))

  const step = (n: number) => { const d = new Date(year, month + n, 1); setYear(d.getFullYear()); setMonth(d.getMonth()) }
  const exportDoc = async () => {
    setBusy(true)
    try {
      const { exportMonthReportDoc } = await import('@/lib/export-word')
      await exportMonthReportDoc({ title: `${MONTHS[month]} ${year}`, data, report: draft, membersJoined: joined }, `ASO-monthly-report-${key}.doc`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The report could not be made.', false)
    } finally {
      setBusy(false)
    }
  }

  const stats: [string, number | string, React.ElementType][] = [
    ['Sessions held', data.totals.held, CalendarX2],
    ['Canceled', data.totals.canceled, CalendarX2],
    ['Absences', data.absences.length, UserX],
    ['Posts', data.posts.length, Send],
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <PageHead
        title="Monthly report"
        subtitle="Everything that happened in the space, worked out from the calendar. Add the words and the head counts, then download it as a Word document."
        right={<Button size="sm" onClick={() => void exportDoc()} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Download Word report</Button>}
      />

      <div className="mb-4 flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => step(-1)} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
        <div className="min-w-[10rem] text-center text-base font-extrabold tracking-tight">{MONTHS[month]} {year}</div>
        <Button variant="outline" size="icon" onClick={() => step(1)} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <div className="text-2xl font-extrabold leading-none tabular-nums">{n}</div>
            <div className="text-xs font-semibold text-muted-foreground">{label}</div>
          </div>
        ))}
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <div className="text-2xl font-extrabold leading-none tabular-nums">{joined ?? '-'}</div>
          <div className="text-xs font-semibold text-muted-foreground">New library members</div>
        </div>
      </div>
      {joined === null && <p className="mt-1.5 text-xs text-muted-foreground">New members come from the members sheet, which only the app on the director's computer can read.</p>}

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {([['highlights', 'Highlights', 'What went well this month'], ['challenges', 'Challenges', 'What was difficult'], ['next', 'Plans for next month', 'What comes next']] as const).map(([f, label, ph]) => (
          <label key={f} className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <span className="text-sm font-extrabold tracking-tight">{label}</span>
            <textarea className={cn(area, 'min-h-32')} value={draft[f] || ''} placeholder={ph} onChange={(e) => change((d) => ({ ...d, [f]: e.target.value }))} />
          </label>
        ))}
      </div>

      {(['club', 'event', 'class'] as const).map((kind) => {
        const rows = data.items.filter((i) => i.kind === kind)
        if (!rows.length) return null
        return (
          <section key={kind} className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-extrabold tracking-tight">{kind === 'club' ? 'Clubs' : kind === 'event' ? 'Events' : 'Classes'}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-bold">Name</th><th className="py-2 pr-3 font-bold">Held</th><th className="py-2 pr-3 font-bold">Canceled</th><th className="w-24 py-2 pr-3 font-bold">People</th><th className="py-2 font-bold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((i) => (
                    <tr key={i.key} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 font-semibold">{i.name}</td>
                      <td className="py-2 pr-3 tabular-nums">{i.held}</td>
                      <td className="py-2 pr-3 tabular-nums text-muted-foreground">{i.canceled || ''}</td>
                      <td className="py-1.5 pr-3"><input type="number" min={0} className={area} value={draft.items?.[i.key]?.attendance ?? ''} onChange={(e) => item(i.key, 'attendance', e.target.value)} aria-label={`People at ${i.name}`} /></td>
                      <td className="py-1.5"><input className={area} value={draft.items?.[i.key]?.note || ''} onChange={(e) => item(i.key, 'note', e.target.value)} aria-label={`Notes on ${i.name}`} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}

      {data.absences.length > 0 && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-extrabold tracking-tight">Absences and cancellations</h2>
          <ul className="grid gap-1 text-sm">
            {data.absences.map((a, i) => (
              <li key={i}><span className="font-bold">{a.who}</span> <span className="text-muted-foreground">{a.from}{a.to !== a.from ? ' to ' + a.to : ''} · {a.reason} · {a.cover === 'canceled' ? 'canceled' : /^held elsewhere/.test(a.cover) ? a.cover : 'covered by ' + a.cover}</span></li>
            ))}
          </ul>
        </section>
      )}

      {data.posts.length > 0 && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-extrabold tracking-tight">Social media posts</h2>
          <ul className="grid gap-1 text-sm">
            {data.posts.map((p, i) => (
              <li key={i}><span className="font-bold">{p.name}</span> <span className="text-muted-foreground">{p.t.slice(0, 10)} · {p.to.join(', ')}</span></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
