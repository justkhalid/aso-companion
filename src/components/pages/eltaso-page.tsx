'use client'

import * as React from 'react'
import { GraduationCap, BookOpen, ArrowRight } from 'lucide-react'
import { useStore } from '@/lib/store'
import { termStatus } from '@/lib/app-utils'
import { BANDS } from '@/lib/constants'
import { Chip, PageHead } from '@/components/ui-bits'

export function EltasoPage() {
  const state = useStore((s) => s.state)
  const openLevel = useStore((s) => s.openLevel)
  const st = termStatus(state)
  const inSession = st.mode === 's1' || st.mode === 's2'
  const wi = inSession ? (st.week || 1) - 1 : -1

  // Only levels that actually have at least one class this year get a card.
  const withClasses = state.levels.filter((l) =>
    (state.classes || []).some((c) => c.level === l.label),
  )

  // group by band preserving canonical order
  const groups: { band: string; levels: typeof state.levels }[] = BANDS.map((band) => ({
    band,
    levels: withClasses.filter((l) => l.band === band),
  })).filter((g) => g.levels.length > 0)
  // any level with empty band
  const other = withClasses.filter((l) => !l.band)
  if (other.length) groups.push({ band: '', levels: other })

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <PageHead
        title="ELTASO"
        subtitle="The teacher section · weekly plans for every level, the library and reports."
      />

      <div className="mb-5 flex items-center gap-2">
        <h2 className="text-[15px] font-extrabold tracking-tight">Weekly plans</h2>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">
          {withClasses.length} levels · {withClasses.reduce((m, l) => m + l.weeks.length, 0)} weeks
        </span>
      </div>

      {groups.map((g) => (
        <div key={g.band || 'other'} className="mb-6">
          {g.band && (
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {g.band}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.levels.map((l) => {
              const w = wi >= 0 && wi < l.weeks.length ? l.weeks[wi] : null
              const showWi = w ? wi : Math.min(l.weeks.length - 1, Math.max(0, wi))
              const sw = l.weeks[showWi]
              return (
                <button
                  key={l.key}
                  onClick={() => openLevel(l.key)}
                  className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div className="flex-1 font-bold leading-tight">{l.label}</div>
                    <Chip tone="primary">{l.cefr}</Chip>
                  </div>
                  {sw && (
                    <div className="text-xs font-semibold text-primary">
                      {w ? 'This week' : 'Next up'} · W{showWi + 1} · {sw.theme}
                    </div>
                  )}
                  <div className="mt-auto flex items-center gap-1 pt-1 text-xs font-bold text-primary">
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* library + reports quick links */}
      <div className="mb-2 mt-2 text-[15px] font-extrabold tracking-tight">More</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 font-bold">
            <BookOpen className="h-4 w-4 text-primary" /> Library
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {state.library.length} Drive folders, grouped by category and tagged by skill.
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 font-bold">
            <BookOpen className="h-4 w-4 text-primary" /> Reports
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            How reporting works at ASO: the official system, the form, and one example.
          </div>
        </div>
      </div>
    </div>
  )
}
