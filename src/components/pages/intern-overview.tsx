'use client'

import * as React from 'react'
import { Sparkles, CalendarDays, Users, ArrowRight, Plus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { termStatus, weekMonday, fmtD, nextOccurrence } from '@/lib/app-utils'
import { DAY_KEYS, DAY_FULL } from '@/lib/constants'
import { PageHead, SectionHeader } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'

export function InternOverview() {
  const state = useStore((s) => s.state)
  const setView = useStore((s) => s.setView)

  const st = termStatus(state)
  const inSession = st.mode === 's1' || st.mode === 's2'
  const mon = inSession ? weekMonday(state, (st.week || 1) - 1) : new Date()

  // weekly roster this week
  const byDay: Record<string, { name: string; time: string; room: string; lead: string }[]> = {}
  DAY_KEYS.forEach((d) => {
    byDay[d] = (state.clubs || [])
      .filter((c) => (c.days || []).includes(d))
      .sort((a, b) => String(a.time).localeCompare(String(b.time)))
      .map((c) => ({ name: c.name, time: c.time, room: c.room, lead: c.lead }))
  })

  const upcoming = (state.events || [])
    .map((e) => ({ e, d: nextOccurrence(e) }))
    .filter((x) => x.d)
    .sort((a, b) => a.d!.getTime() - b.d!.getTime())
    .slice(0, 5)

  const unstaffed = (state.clubs || []).filter((c) => !c.lead).length

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <PageHead
        title="Internship"
        subtitle={`The American Space week${inSession ? ` · Week ${st.week}` : ''} · clubs, events, volunteers and reports.`}
        right={
          <Button size="sm" onClick={() => setView('intern-clubs')}>
            <Plus className="h-4 w-4" /> Add club
          </Button>
        }
      />

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Sparkles className="h-5 w-5" />} value={state.clubs.length} label="Clubs" onClick={() => setView('intern-clubs')} />
        <StatCard icon={<CalendarDays className="h-5 w-5" />} value={state.events.length} label="Events" onClick={() => setView('intern-events')} />
        <StatCard icon={<Users className="h-5 w-5" />} value={state.volunteers.length} label="Volunteers" onClick={() => setView('intern-volunteers')} />
        <StatCard icon={<Sparkles className="h-5 w-5" />} value={unstaffed} label="Need a lead" tone="gold" />
      </div>

      {/* this week roster */}
      <div className="mt-6">
        <SectionHeader
          title="This week roster"
          right={
            <button onClick={() => setView('clubs')} className="inline-flex items-center gap-1 text-xs font-bold text-primary">
              Open calendar <ArrowRight className="h-3.5 w-3.5" />
            </button>
          }
        />
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 text-sm font-semibold text-muted-foreground">
            Week of {fmtD(mon, { day: 'numeric', month: 'long' })}
          </div>
          <div className="flex flex-col gap-2">
            {DAY_KEYS.map((d) => {
              const list = byDay[d] || []
              if (!list.length) return null
              return (
                <div key={d} className="rounded-lg border border-border p-3">
                  <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {DAY_FULL[d]}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {list.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-xs font-bold text-muted-foreground">{c.time || '-'}</span>
                        <span className="flex-1 font-semibold">{c.name}</span>
                        {c.room && <span className="text-xs text-muted-foreground">{c.room}</span>}
                        {c.lead ? (
                          <span className="text-xs text-muted-foreground">lead: {c.lead}</span>
                        ) : (
                          <span className="text-xs font-bold text-[var(--aso-gold)]">NO LEAD</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* upcoming events */}
      <div className="mt-6">
        <SectionHeader
          title="Upcoming events"
          right={
            <button onClick={() => setView('intern-events')} className="inline-flex items-center gap-1 text-xs font-bold text-primary">
              All events <ArrowRight className="h-3.5 w-3.5" />
            </button>
          }
        />
        {upcoming.length ? (
          <div className="flex flex-col gap-2">
            {upcoming.map(({ e, d }) => (
              <div key={e.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--aso-gold-tint)] text-[var(--aso-gold)]">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{e.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {fmtD(d!, { weekday: 'long', day: 'numeric', month: 'long' })}
                    {e.time ? ` · ${e.time}` : ''}
                    {e.place ? ` · ${e.place}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No upcoming events.
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
  onClick,
  tone = 'primary',
}: {
  icon: React.ReactNode
  value: number
  label: string
  onClick?: () => void
  tone?: 'primary' | 'gold'
}) {
  const Comp: any = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition ${onClick ? 'hover:border-primary/40' : ''}`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${tone === 'gold' ? 'bg-[var(--aso-gold-tint)] text-[var(--aso-gold)]' : 'bg-primary/10 text-primary'}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-extrabold leading-none">{value}</div>
        <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      </div>
    </Comp>
  )
}
