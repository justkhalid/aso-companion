import * as React from 'react'
import Link from 'next/link'
import { Logo } from '@/components/logo'

/* Shared layout of the Privacy and Terms pages: header, a plain-words summary, a contents list and numbered sections. */

export interface LegalSection {
  id: string
  title: string
  body: React.ReactNode
}

const OTHER = { privacy: { href: '/terms', label: 'Terms of service' }, terms: { href: '/privacy', label: 'Privacy policy' } }

export function LegalLayout({ kind, title, updated, summary, sections }: { kind: 'privacy' | 'terms'; title: string; updated: string; summary: React.ReactNode; sections: LegalSection[] }) {
  const other = OTHER[kind]
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <Link href="/" className="flex items-center gap-3" aria-label="ASO Companion home">
            <Logo size={36} />
            <span className="leading-tight">
              <span className="block font-display text-[15px] font-extrabold tracking-tight">ASO Companion</span>
              <span className="block text-[11px] text-muted-foreground">American Space Oujda</span>
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-4 text-xs font-semibold">
            <Link href="/privacy" className={kind === 'privacy' ? 'underline underline-offset-4' : 'text-muted-foreground hover:text-foreground'}>Privacy</Link>
            <Link href="/terms" className={kind === 'terms' ? 'underline underline-offset-4' : 'text-muted-foreground hover:text-foreground'}>Terms</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20 pt-12">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">Legal</div>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated {updated}</p>

        <div className="mt-8 rounded-2xl border border-border bg-gradient-to-br from-secondary/70 to-card p-6 shadow-sm">
          <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">In plain words</div>
          <div className="mt-2 flex flex-col gap-2 text-[15px] leading-relaxed">{summary}</div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">Contents</div>
            <ol className="mt-3 flex flex-col gap-1.5 text-sm">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex gap-2 text-muted-foreground hover:text-foreground">
                    <span className="w-5 shrink-0 tabular-nums text-muted-foreground/70">{i + 1}.</span>
                    <span>{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </aside>

          <div className="flex flex-col gap-10">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-8">
                <h2 className="flex items-baseline gap-3 font-display text-2xl font-extrabold tracking-tight">
                  <span className="text-base tabular-nums text-primary">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </h2>
                <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-foreground/90 [&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_li]:pl-1 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1.5">
                  {s.body}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-sm">
          <Link href={other.href} className="font-semibold text-primary underline underline-offset-4">{other.label}</Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground">Back to the calendar</Link>
        </div>
      </main>
    </div>
  )
}

/* a small card for one kind of information, used in the privacy policy */
export function InfoCard({ title, what, why, where }: { title: string; what: string; why: string; where: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-extrabold tracking-tight">{title}</h3>
      <dl className="mt-2 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[88px_minmax(0,1fr)]">
        <dt className="text-muted-foreground">What</dt>
        <dd>{what}</dd>
        <dt className="text-muted-foreground">Why</dt>
        <dd>{why}</dd>
        <dt className="text-muted-foreground">Who sees it</dt>
        <dd>{where}</dd>
      </dl>
    </div>
  )
}
