'use client'

import * as React from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Check, CircleAlert, Copy, Loader2, RefreshCw, Search, Unplug, Users } from 'lucide-react'
import { PageHead, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'

interface Member { all: Record<string, unknown>; nr: number; name: string; occupation: string; date: string; joined: string; q: unknown; cardPrinted: boolean; hasPhoto: boolean; banned: boolean; duplicates: number[] }
interface Summary { total: number; thisMonth: number; thisYear: number; cardsToPrint: number; noPhoto: number; banned: number; withDuplicates: number }
interface Reply { available: boolean; connected: boolean; members?: Member[]; summary?: Summary; fetchedAt?: string; error?: string }

const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary'
const PAGE = 50
type Filter = 'all' | 'print' | 'photo' | 'banned' | 'dupes'
const FILTERS: [Filter, string][] = [['all', 'Everyone'], ['print', 'Card to print'], ['photo', 'No photo'], ['dupes', 'Maybe entered twice'], ['banned', 'Banned']]

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/* joined is yyyy-mm-dd, yyyy-mm or yyyy; anything unreadable is shown as the sheet wrote it */
const day = (m: Member) => {
  const [y, mo, d] = m.joined.split('-')
  if (!y) return m.date
  return [d && String(+d), mo && MON[+mo - 1], y].filter(Boolean).join(' ')
}
const label = (k: string) => k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase())
function Value({ v }: { v: unknown }) {
  if (v === null || v === undefined || v === '') return <span className="text-muted-foreground">-</span>
  if (typeof v === 'boolean') return <>{v ? 'Yes' : 'No'}</>
  if (Array.isArray(v)) return <>{v.length ? v.join(', ') : '-'}</>
  if (typeof v === 'object') return <>{JSON.stringify(v)}</>
  const t = String(v)
  if (/^https?:\/\/\S+$/.test(t)) return <a href={t} target="_blank" rel="noreferrer" className="break-all text-primary underline">{t.length > 60 ? t.slice(0, 57) + '...' : t}</a>
  if (t.length > 400) return <span className="text-muted-foreground">(a long value, {t.length} characters)</span>
  return <span className="whitespace-pre-wrap break-words">{t}</span>
}
type SortKey = 'nr' | 'name' | 'job' | 'joined' | 'card' | 'photo'
const SORTERS: Record<SortKey, (m: Member) => string | number> = {
  nr: (m) => m.nr,
  name: (m) => m.name.toLowerCase(),
  job: (m) => m.occupation.toLowerCase(),
  joined: (m) => m.joined || '',
  card: (m) => (m.cardPrinted ? 1 : 0),
  photo: (m) => (m.hasPhoto ? 1 : 0),
}

/* Library > Members: the members of the ASO library, read live from the Google Sheet (only in the app on the director's computer) */
export function MembersPage() {
  const toast = useStore((s) => s.toast)
  const [data, setData] = React.useState<Reply | null>(null)
  const [state, setState] = React.useState<'ok' | 'signin' | 'error'>('ok')
  const [busy, setBusy] = React.useState(false)
  const [q, setQ] = React.useState('')
  const [filter, setFilter] = React.useState<Filter>('all')
  const [page, setPage] = React.useState(0)
  const [sort, setSort] = React.useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'nr', dir: -1 })
  const [url, setUrl] = React.useState('')
  const [key, setKey] = React.useState('')
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null)
  const [confirmOff, setConfirmOff] = React.useState(false)
  const [open, setOpen] = React.useState<Member | null>(null)
  const [full, setFull] = React.useState<{ nr: number; data?: Record<string, unknown> | null; error?: string } | null>(null)
  const openMember = (m: Member) => {
    setOpen(m)
    setFull(null)
    fetch('/api/members?nr=' + m.nr, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: { member?: Record<string, unknown> | null; error?: string }) => setFull({ nr: m.nr, data: j.member, error: j.error }))
      .catch(() => setFull({ nr: m.nr, error: 'The details could not be loaded.' }))
  }

  const load = React.useCallback(async (fresh = false) => {
    setBusy(true)
    try {
      const r = await fetch('/api/members' + (fresh ? '?fresh=1' : ''), { cache: 'no-store' })
      if (r.status === 401) { setState('signin'); return }
      if (!r.ok) { setState('error'); return }
      setState('ok')
      setData((await r.json()) as Reply)
    } catch {
      setState('error')
    } finally {
      setBusy(false)
    }
  }, [])
  React.useEffect(() => { void load() }, [load])

  const connect = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch('/api/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, key }) })
      const j = (await r.json()) as { ok: boolean; msg: string }
      setMsg({ ok: j.ok, text: j.msg })
      if (j.ok) { setUrl(''); setKey(''); await load(true) }
    } catch {
      setMsg({ ok: false, text: 'The app could not be reached.' })
    } finally {
      setBusy(false)
    }
  }

  const members = data?.members
  const rows = React.useMemo(() => {
    if (!members) return []
    const t = q.trim().toLowerCase()
    return members
      .filter((m) => (filter === 'print' ? !m.cardPrinted && !m.banned : filter === 'photo' ? !m.hasPhoto : filter === 'banned' ? m.banned : filter === 'dupes' ? m.duplicates.length > 0 : true))
      .filter((m) => !t || m.name.toLowerCase().includes(t) || String(m.nr) === t || m.occupation.toLowerCase().includes(t))
      .sort((a, b) => {
        const f = SORTERS[sort.key]
        const x = f(a), y = f(b)
        return (x < y ? -1 : x > y ? 1 : a.nr - b.nr) * sort.dir
      })
  }, [members, q, filter, sort])
  React.useEffect(() => setPage(0), [q, filter, sort])
  const sortBy = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'nr' || key === 'joined' ? -1 : 1 }))

  const byYear = React.useMemo(() => {
    const m = new Map<string, number>()
    for (const x of members || []) { const y = x.joined.slice(0, 4); if (y) m.set(y, (m.get(y) || 0) + 1) }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [members])
  const jobs = React.useMemo(() => {
    const m = new Map<string, number>()
    for (const x of members || []) { const o = x.occupation.trim().toLowerCase() || '(not given)'; m.set(o, (m.get(o) || 0) + 1) }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [members])

  if (state === 'signin') return <div className="mx-auto max-w-2xl px-4 py-8"><EmptyState title="Sign in as admin to see the members" /></div>
  const s = data?.summary

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <PageHead
        title="Members"
        subtitle="The members of the ASO library, read live from the Google Sheet."
        right={data?.connected && (
          <Button size="sm" variant="outline" onClick={() => void load(true)} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
          </Button>
        )}
      />

      {state === 'error' && <p className="mb-4 text-sm text-destructive">The members could not be loaded. Try Refresh.</p>}
      {!data && state === 'ok' && <p className="text-sm text-muted-foreground">Loading...</p>}

      {data && !data.available && (
        <EmptyState icon={<Users className="h-5 w-5" />} title="Members open only in the app on the director's computer" hint="The list holds personal details, so it never goes through the website. Open the ASO Companion app on the director's computer." />
      )}

      {data?.available && !data.connected && (
        <div className="mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-extrabold">Connect the members sheet</h2>
          <p className="text-xs text-muted-foreground">Paste the link of the Google Apps Script and its key. They are checked, then kept encrypted on this computer only. They are not saved on the website or on GitHub, and not shown again.</p>
          <div>
            <div className="mb-1.5 text-xs font-bold">Link</div>
            <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" autoComplete="off" spellCheck={false} />
          </div>
          <div>
            <div className="mb-1.5 text-xs font-bold">Key</div>
            <input className={inputCls} type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
          </div>
          <Button className="self-start" onClick={() => void connect()} disabled={busy || !url.trim() || !key.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Connect
          </Button>
          {msg && <p className={cn('text-xs font-semibold', msg.ok ? 'text-[var(--aso-ok)]' : 'text-destructive')}>{msg.text}</p>}
        </div>
      )}

      {data?.connected && data.error && (
        <div className="rounded-2xl border border-border bg-card p-5 text-sm">
          <p className="flex items-center gap-2 font-bold text-destructive"><CircleAlert className="h-4 w-4" /> The sheet could not be read.</p>
          <p className="mt-1 text-xs text-muted-foreground">{data.error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setConfirmOff(true)}><Unplug className="h-4 w-4" /> Connect again</Button>
        </div>
      )}

      {data?.connected && s && members && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              ['Members', s.total, 'all'],
              ['Joined this month', s.thisMonth, null],
              ['Joined this year', s.thisYear, null],
              ['Cards to print', s.cardsToPrint, 'print'],
              ['No photo', s.noPhoto, 'photo'],
              ['Maybe entered twice', s.withDuplicates, 'dupes'],
              ['Banned', s.banned, 'banned'],
            ] as [string, number, Filter | null][]).map(([label, n, f]) => (
              <button key={label} type="button" disabled={!f} onClick={() => f && setFilter(f)} className={cn('flex flex-col items-start gap-0.5 rounded-2xl border bg-card p-3 text-left shadow-sm', f ? 'hover:border-primary/40' : 'cursor-default', f && filter === f && f !== 'all' ? 'border-primary' : 'border-border')}>
                <span className="text-2xl font-extrabold leading-none tabular-nums">{n}</span>
                <span className="text-xs font-semibold text-muted-foreground">{label}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-extrabold tracking-tight">Joined per year</h2>
              {byYear.length === 0 ? (
                <p className="text-sm text-muted-foreground">No join dates could be read from the sheet.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {byYear.map(([y, n]) => (
                    <li key={y} className="flex items-center gap-2 text-sm">
                      <span className="w-10 shrink-0 font-semibold tabular-nums">{y}</span>
                      <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary/70" style={{ width: `${(n / Math.max(...byYear.map((x) => x[1]))) * 100}%` }} /></div>
                      <span className="w-10 text-right text-xs font-bold tabular-nums">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-extrabold tracking-tight">What members do</h2>
              <ul className="flex flex-col gap-1.5">
                {jobs.map(([j, n]) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate capitalize">{j}</span>
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary/70" style={{ width: `${(n / jobs[0][1]) * 100}%` }} /></div>
                    <span className="w-8 text-right text-xs font-bold tabular-nums">{n}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[12rem] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input className={cn(inputCls, 'pl-9')} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a name, a number or a job" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map(([f, label]) => (
                  <button key={f} type="button" onClick={() => setFilter(f)} className={cn('rounded-full border px-3 py-1.5 text-xs font-bold transition', filter === f ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-secondary')}>{label}</button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    {([['nr', 'Nr'], ['name', 'Name'], ['job', 'Job'], ['joined', 'Joined'], ['card', 'Card'], ['photo', 'Photo']] as [SortKey, string][]).map(([k, label]) => (
                      <th key={k} className="py-2 pr-3 font-bold" aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                        <button type="button" onClick={() => sortBy(k)} className={cn('inline-flex items-center gap-1 hover:text-foreground', sort.key === k && 'text-foreground')}>
                          {label}
                          {sort.key === k ? (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                        </button>
                      </th>
                    ))}
                    <th className="py-2 font-bold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(page * PAGE, page * PAGE + PAGE).map((m) => (
                    <tr key={m.nr} className={cn('border-b border-border/60 last:border-0', m.banned && 'bg-destructive/5')}>
                      <td className="py-2 pr-3 tabular-nums text-muted-foreground">{m.nr}</td>
                      <td className="py-2 pr-3 font-semibold"><button type="button" onClick={() => openMember(m)} className="text-left hover:text-primary hover:underline">{m.name || '(no name)'}</button></td>
                      <td className="py-2 pr-3 capitalize text-muted-foreground">{m.occupation}</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{day(m)}</td>
                      <td className="py-2 pr-3">{m.cardPrinted ? <span className="text-[var(--aso-ok)]">Printed</span> : <span className="text-[var(--aso-gold)]">To print</span>}</td>
                      <td className="py-2 pr-3">{m.hasPhoto ? 'Yes' : <span className="text-[var(--aso-gold)]">No</span>}</td>
                      <td className="py-2 text-xs">
                        {m.banned && <span className="font-bold text-destructive">Banned </span>}
                        {m.duplicates.length > 0 && <span className="inline-flex items-center gap-1 text-[var(--aso-gold)]"><Copy className="h-3 w-3" /> same as {m.duplicates.join(', ')}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nobody matches.</p>}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{rows.length} {rows.length === 1 ? 'person' : 'people'}</span>
              <span className="ml-auto" />
              <Button type="button" variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span>{page + 1} / {Math.max(1, Math.ceil(rows.length / PAGE))}</span>
              <Button type="button" variant="outline" size="sm" disabled={(page + 1) * PAGE >= rows.length} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </section>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Read from the sheet {data.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}.</span>
            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmOff(true)}><Unplug className="h-4 w-4" /> Disconnect the sheet</Button>
          </div>
        </>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.name || '(no name)'}</DialogTitle>
                <DialogDescription>Member number {open.nr}{open.banned ? ' · Banned' : ''}</DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">
                {Object.entries(full?.nr === open.nr && full.data ? full.data : open.all).map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt className="text-xs font-bold text-muted-foreground">{label(k)}</dt>
                    <dd><Value v={v} /></dd>
                  </React.Fragment>
                ))}
              </dl>
              {full?.nr !== open.nr && <p className="text-xs text-muted-foreground">Loading the full details...</p>}
              {full?.nr === open.nr && full.error && <p className="text-xs text-destructive">{full.error}</p>}
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOff} onOpenChange={setConfirmOff}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect the members sheet?</AlertDialogTitle>
            <AlertDialogDescription>The app forgets the link and the key. The sheet itself is not touched. You can connect it again with the link and key.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await fetch('/api/members', { method: 'DELETE' }); toast('Disconnected'); setData(null); setMsg(null); void load() }}>Disconnect</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {filter === 'dupes' && <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> The sheet flags these people as possibly the same person registered under more than one number. "same as" shows the other number. Check the two cards, then keep one.</p>}
    </div>
  )
}
