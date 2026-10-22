'use client'

import * as React from 'react'
import { Boxes, Camera, ClipboardCheck, Loader2, Plug, Plus, Printer, RefreshCw, ScanLine, Search, Unplug, Upload, X } from 'lucide-react'
import { PageHead, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { classifyScan, code39Svg } from '@/lib/scan'
import type { Item, ItemStatus, ItemType } from '@/lib/inventory'

interface Reply { available: boolean; connected: boolean; items?: Item[]; next?: string; error?: string }

const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary'
const TYPE_LABEL: Record<ItemType, string> = { book: 'Book', equipment: 'Equipment', furniture: 'Furniture', game: 'Game', other: 'Other' }
const STATUS_LABEL: Record<ItemStatus, string> = { available: 'Available', lent: 'Lent out', repair: 'In repair', missing: 'Missing' }
const STATUS_CLS: Record<ItemStatus, string> = {
  available: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  lent: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  repair: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  missing: 'bg-red-500/15 text-red-700 dark:text-red-300',
}
const CONDITIONS = ['New', 'Good', 'Worn', 'Damaged']

const blank = (): Partial<Item> => ({ type: 'book', name: '', by: '', model: '', serial: '', category: '', room: '', shelf: '', copies: 1, condition: 'Good', status: 'available', year: '', notes: '', barcode: '' })

/* a short high beep for a good scan, a low one for a bad scan */
function beep(good: boolean) {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = good ? 1100 : 240
    g.gain.value = 0.08
    o.connect(g); g.connect(ctx.destination)
    o.start(); o.stop(ctx.currentTime + (good ? 0.09 : 0.3))
    setTimeout(() => void ctx.close(), 500)
  } catch { /* no sound */ }
}

/* a picture from the webcam or a file, shrunk to 800 px so it stays small */
function shrink(src: CanvasImageSource, w: number, h: number): string {
  const k = Math.min(1, 800 / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.round(w * k); c.height = Math.round(h * k)
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.82)
}
const fileToDataUrl = (f: File) => new Promise<string>((res, rej) => {
  const img = new Image()
  const url = URL.createObjectURL(f)
  img.onload = () => { res(shrink(img, img.naturalWidth, img.naturalHeight)); URL.revokeObjectURL(url) }
  img.onerror = () => rej(new Error('That file is not a picture.'))
  img.src = url
})

const photoUrl = (i: Item) => `/api/inventory/photo?code=${i.code}&v=${encodeURIComponent(i.updatedAt)}`

function Thumb({ item, size = 40 }: { item: Item; size?: number }) {
  return item.hasPhoto
    ? <img src={photoUrl(item)} alt="" width={size} height={size} className="rounded-md object-cover" style={{ width: size, height: size * 1.25 }} />
    : <span className="flex items-center justify-center rounded-md bg-secondary text-muted-foreground" style={{ width: size, height: size * 1.25 }}><Boxes className="h-4 w-4" aria-hidden /></span>
}

export function InventoryPage() {
  const toast = useStore((s) => s.toast)
  const [data, setData] = React.useState<Reply | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [state, setState] = React.useState<'loading' | 'ok' | 'signin' | 'error'>('loading')
  const [q, setQ] = React.useState('')
  const [type, setType] = React.useState<'all' | ItemType>('all')
  const [status, setStatus] = React.useState<'all' | ItemStatus>('all')
  const [room, setRoom] = React.useState('all')
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null)
  const [edit, setEdit] = React.useState<Partial<Item> | null>(null) // the item being added or changed
  const [isNew, setIsNew] = React.useState(false)
  const [connectOpen, setConnectOpen] = React.useState(false)
  const [labelsOpen, setLabelsOpen] = React.useState(false)
  const [stock, setStock] = React.useState<{ room: string; seen: Record<string, number>; unknown: string[] } | null>(null)
  const scanRef = React.useRef<HTMLInputElement>(null)
  const items = React.useMemo(() => data?.items || [], [data])

  const load = React.useCallback(async (fresh = false) => {
    setBusy(true)
    try {
      const r = await fetch('/api/inventory' + (fresh ? '?fresh=1' : ''), { cache: 'no-store' })
      if (r.status === 401) { setState('signin'); return }
      if (!r.ok) { setState('error'); return }
      setState('ok')
      setData((await r.json()) as Reply)
    } catch { setState('error') } finally { setBusy(false) }
  }, [])
  React.useEffect(() => { void load() }, [load])

  const post = async (body: Record<string, unknown>) => {
    const r = await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return (await r.json()) as { ok: boolean; msg?: string; item?: Item }
  }

  /* ---------- scanning ---------- */
  const note = (ok: boolean, text: string) => { setMsg({ ok, text }); beep(ok) }
  const itemsRef = React.useRef(items)
  const editRef = React.useRef(edit)
  const stockRef = React.useRef(stock)
  React.useEffect(() => { itemsRef.current = items; editRef.current = edit; stockRef.current = stock })

  const openNew = React.useCallback(async (barcode: string, isbn: boolean) => {
    setIsNew(true)
    setEdit({ ...blank(), barcode, type: isbn ? 'book' : 'equipment' })
    if (!isbn) { note(true, 'New item. Type what it is and take a photo.'); return }
    note(true, 'New book. Looking it up online...')
    try {
      const r = await fetch('/api/inventory?isbn=' + barcode, { cache: 'no-store' })
      const j = (await r.json()) as { book?: { name: string; by: string; year: string; category: string; cover: string } | null }
      if (j.book) {
        setEdit((e) => (e && e.barcode === barcode ? { ...e, name: j.book!.name, by: j.book!.by, year: j.book!.year, category: j.book!.category, ...(j.book!.cover ? { _photo: j.book!.cover } : {}) } as Partial<Item> : e))
        setMsg({ ok: true, text: 'Found online. Check the details, add the shelf and save.' })
      } else setMsg({ ok: true, text: 'Not found online. Type the title and author yourself.' })
    } catch { setMsg({ ok: true, text: 'Could not look it up. Type the title and author yourself.' }) }
  }, [])

  const handleScan = React.useCallback((raw: string) => {
    const s = classifyScan(raw)
    if (s.kind === 'bad') { note(false, s.why); return }
    const list = itemsRef.current
    const st = stockRef.current
    if (s.kind === 'member') {
      const e = editRef.current
      if (e && !isNew && e.code && e.status !== 'lent') {
        setEdit({ ...e, status: 'lent', lentTo: String(Number(s.code)), lentAt: new Date().toISOString() })
        note(true, `Member ${Number(s.code)} will borrow it. Press Save.`)
      } else note(true, `Member card ${Number(s.code)}. Open an item first to lend it.`)
      return
    }
    const found = s.kind === 'item' ? list.find((i) => i.code === s.code) : list.find((i) => i.barcode && i.barcode === s.code)
    if (st) {
      if (!found) { setStock({ ...st, unknown: [...st.unknown, s.code] }); note(false, `${s.code} is not in the inventory.`); return }
      setStock({ ...st, seen: { ...st.seen, [found.code]: (st.seen[found.code] || 0) + 1 } })
      note(true, `${found.name}${found.room && st.room !== 'all' && found.room !== st.room ? ' (belongs in ' + found.room + ')' : ''}`)
      return
    }
    if (found) { setIsNew(false); setEdit(found); note(true, found.name); return }
    if (s.kind === 'item') { note(false, 'That label is not in the inventory.'); return }
    void openNew(s.code, s.isbn)
  }, [isNew, openNew])

  /* the scan box keeps the keyboard, so the first digits of a scan are never lost */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
      if (typing || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return
      if (document.querySelector('[role="dialog"]')) return
      scanRef.current?.focus()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
  React.useEffect(() => { if (state === 'ok') scanRef.current?.focus() }, [state])

  const rooms = React.useMemo(() => [...new Set(items.map((i) => i.room).filter(Boolean))].sort(), [items])
  const shown = React.useMemo(() => {
    const t = q.trim().toLowerCase()
    return items
      .filter((i) => (type === 'all' || i.type === type) && (status === 'all' || i.status === status) && (room === 'all' || i.room === room))
      .filter((i) => !t || [i.name, i.by, i.category, i.code, i.barcode, i.model, i.serial, i.room, i.shelf].some((v) => v.toLowerCase().includes(t)))
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
  }, [items, q, type, status, room])
  const counts = React.useMemo(() => ({
    total: items.reduce((n, i) => n + i.copies, 0),
    kinds: items.length,
    lent: items.filter((i) => i.status === 'lent').length,
    missing: items.filter((i) => i.status === 'missing').length,
    repair: items.filter((i) => i.status === 'repair').length,
  }), [items])

  const save = async (it: Partial<Item> & { _photo?: string }) => {
    setBusy(true)
    try {
      const { _photo, ...item } = it
      const j = await post({ action: 'save', item, photo: _photo })
      if (!j.ok) { toast(j.msg || 'Could not save.', false); return false }
      toast(isNew ? 'Item added.' : 'Saved.', true)
      setEdit(null)
      await load(true)
      scanRef.current?.focus()
      return true
    } catch { toast('The app could not be reached.', false); return false } finally { setBusy(false) }
  }
  const remove = async (code: string) => {
    setBusy(true)
    try {
      const j = await post({ action: 'delete', code })
      if (!j.ok) { toast(j.msg || 'Could not delete.', false); return }
      setEdit(null); await load(true)
    } finally { setBusy(false) }
  }

  if (state === 'signin') return <div className="mx-auto max-w-2xl px-4 py-8"><EmptyState title="Sign in as admin to see the inventory" /></div>
  if (data && !data.available) return <div className="mx-auto max-w-2xl px-4 py-8"><EmptyState title="The inventory works in the app on the director's computer" hint="It is not shown on the public website." /></div>

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <PageHead
        title="Inventory"
        subtitle="Every book and piece of equipment in the space. Scan it to find it, add it or lend it."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold', data?.connected ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-secondary text-muted-foreground')}>
              <Plug className="h-3.5 w-3.5" aria-hidden /> {data?.connected ? 'Google Sheet' : 'This computer only'}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={() => void load(true)} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setConnectOpen(true)}><Plug className="h-4 w-4" /> Sheet</Button>
          </div>
        }
      />

      {state === 'error' && <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">The inventory could not be loaded. Press Refresh.</p>}
      {data?.error && <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">{data.error}</p>}

      {/* the scan box */}
      <div className={cn('mb-4 rounded-2xl border-2 bg-card p-4', msg && !msg.ok ? 'border-red-500/60' : 'border-primary/50')}>
        <div className="flex items-center gap-3">
          <ScanLine className="h-6 w-6 shrink-0 text-primary" aria-hidden />
          <input
            ref={scanRef}
            className="min-w-0 flex-1 bg-transparent text-lg font-bold tracking-wider outline-none placeholder:font-normal placeholder:tracking-normal"
            placeholder={stock ? 'Scan the items in this room' : 'Scan a barcode, or type a number and press Enter'}
            inputMode="text"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              const v = e.currentTarget.value
              e.currentTarget.value = ''
              if (v.trim()) handleScan(v)
            }}
            onBlur={() => setTimeout(() => {
              const a = document.activeElement
              const typing = a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT')
              if (!typing && !document.querySelector('[role="dialog"]')) scanRef.current?.focus()
            }, 150)}
          />
          <Button type="button" size="sm" onClick={() => { setIsNew(true); setEdit(blank()) }}><Plus className="h-4 w-4" /> Add by hand</Button>
        </div>
        {msg && <p className={cn('mt-2 text-sm font-semibold', msg.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300')}>{msg.text}</p>}
      </div>

      {stock && <Stocktake items={items} stock={stock} onStop={() => setStock(null)} onMarkMissing={async (codes) => {
        setBusy(true)
        try { for (const c of codes) { const it = items.find((i) => i.code === c); if (it) await post({ action: 'save', item: { ...it, status: 'missing' } }) } await load(true); toast(`${codes.length} items marked as missing.`, true) } finally { setBusy(false) }
      }} />}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Items in the space', counts.total], ['Different items', counts.kinds], ['Lent out', counts.lent], ['Missing or in repair', counts.missing + counts.repair]].map(([l, n]) => (
          <div key={String(l)} className="rounded-2xl border border-border bg-card px-4 py-3"><div className="text-2xl font-extrabold">{n}</div><div className="text-xs text-muted-foreground">{l}</div></div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input className={cn(inputCls, 'pl-9')} placeholder="Search name, author, number, room..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={cn(inputCls, 'w-auto')} value={type} onChange={(e) => setType(e.target.value as 'all' | ItemType)} aria-label="Type">
          <option value="all">All types</option>
          {(Object.keys(TYPE_LABEL) as ItemType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
        <select className={cn(inputCls, 'w-auto')} value={status} onChange={(e) => setStatus(e.target.value as 'all' | ItemStatus)} aria-label="Status">
          <option value="all">Any status</option>
          {(Object.keys(STATUS_LABEL) as ItemStatus[]).map((t) => <option key={t} value={t}>{STATUS_LABEL[t]}</option>)}
        </select>
        <select className={cn(inputCls, 'w-auto')} value={room} onChange={(e) => setRoom(e.target.value)} aria-label="Room">
          <option value="all">All rooms</option>
          {rooms.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <Button type="button" variant="outline" size="sm" onClick={() => setLabelsOpen(true)} disabled={!items.length}><Printer className="h-4 w-4" /> Labels</Button>
        <Button type="button" variant="outline" size="sm" disabled={!!stock || !items.length} onClick={() => setStock({ room: room === 'all' ? 'all' : room, seen: {}, unknown: [] })}><ClipboardCheck className="h-4 w-4" /> Stocktake</Button>
      </div>

      {!shown.length && state === 'ok' ? (
        <EmptyState title={items.length ? 'Nothing matches' : 'No items yet'} hint={items.length ? 'Change the search or the filters.' : 'Scan something with the scanner, or press Add by hand.'} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {shown.slice(0, 200).map((i) => (
              <li key={i.code}>
                <button type="button" onClick={() => { setIsNew(false); setEdit(i) }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary/60">
                  <Thumb item={i} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{i.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{[i.by, i.category, TYPE_LABEL[i.type]].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="hidden w-32 shrink-0 truncate text-xs text-muted-foreground sm:block">{[i.room, i.shelf].filter(Boolean).join(' · ') || '-'}</span>
                  <span className="hidden w-12 shrink-0 text-xs text-muted-foreground sm:block">x{i.copies}</span>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold', STATUS_CLS[i.status])}>{i.status === 'lent' && i.lentTo ? `Lent to ${i.lentTo}` : STATUS_LABEL[i.status]}</span>
                </button>
              </li>
            ))}
          </ul>
          {shown.length > 200 && <p className="px-4 py-3 text-xs text-muted-foreground">Showing the first 200 of {shown.length}. Use the search to narrow it down.</p>}
        </div>
      )}

      {edit && <ItemDialog item={edit} onChange={setEdit} isNew={isNew} busy={busy} rooms={rooms} onClose={() => { setEdit(null); scanRef.current?.focus() }} onSave={save} onDelete={remove} />}
      {labelsOpen && <LabelsDialog items={items} onClose={() => setLabelsOpen(false)} />}
      {connectOpen && <ConnectDialog connected={!!data?.connected} onClose={() => setConnectOpen(false)} onChanged={() => void load(true)} />}
    </div>
  )
}

/* ---------- one item: add, change, lend, return, delete ---------- */

function ItemDialog({ item, onChange, isNew, busy, rooms, onClose, onSave, onDelete }: {
  item: Partial<Item> & { _photo?: string }
  onChange: (i: Partial<Item>) => void
  isNew: boolean
  busy: boolean
  rooms: string[]
  onClose: () => void
  onSave: (i: Partial<Item> & { _photo?: string }) => Promise<boolean>
  onDelete: (code: string) => void
}) {
  const f = item
  const [cam, setCam] = React.useState(false)
  const [confirmDel, setConfirmDel] = React.useState(false)
  const set = <K extends keyof Item>(k: K, v: Item[K]) => onChange({ ...item, [k]: v })
  const photoSrc = f._photo || (f.hasPhoto && f.code ? photoUrl(f as Item) : '')
  const isEquip = f.type !== 'book'

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'New item' : f.name || 'Item'}</DialogTitle>
          <DialogDescription>{isNew ? 'Fill in what the item is.' : `Number ${f.code}${f.barcode ? ' · barcode ' + f.barcode : ''}`}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
          <div className="flex flex-col gap-2">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-xl border border-border bg-secondary">
              {photoSrc
                            ? <img src={photoSrc} alt="" className="h-full w-full object-cover" />
                : <div className="flex h-full items-center justify-center text-muted-foreground"><Boxes className="h-8 w-8" aria-hidden /></div>}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setCam(true)}><Camera className="h-4 w-4" /> Take a photo</Button>
            <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold hover:bg-secondary">
              <Upload className="h-4 w-4" aria-hidden /> Use a file
              <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { set('_photo' as keyof Item, (await fileToDataUrl(file)) as never) } catch { /* not a picture */ } } e.target.value = '' }} />
            </label>
          </div>

          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select className={inputCls} value={f.type} onChange={(e) => set('type', e.target.value as ItemType)}>
                  {(Object.keys(TYPE_LABEL) as ItemType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                </select>
              </Field>
              <Field label="Category"><input className={inputCls} value={f.category || ''} onChange={(e) => set('category', e.target.value)} placeholder={isEquip ? 'Computer, camera, chair...' : 'Fiction, grammar...'} /></Field>
            </div>
            <Field label="Name"><input className={inputCls} value={f.name || ''} onChange={(e) => set('name', e.target.value)} autoFocus={isNew} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={isEquip ? 'Brand' : 'Author'}><input className={inputCls} value={f.by || ''} onChange={(e) => set('by', e.target.value)} /></Field>
              <Field label={isEquip ? 'Model' : 'Year'}>
                <input className={inputCls} value={(isEquip ? f.model : f.year) || ''} onChange={(e) => (isEquip ? set('model', e.target.value) : set('year', e.target.value))} />
              </Field>
            </div>
            {isEquip && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Serial number"><input className={inputCls} value={f.serial || ''} onChange={(e) => set('serial', e.target.value)} /></Field>
                <Field label="Barcode on it (if any)"><input className={inputCls} value={f.barcode || ''} onChange={(e) => set('barcode', e.target.value.replace(/\D/g, ''))} inputMode="numeric" /></Field>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <Field label="Room"><input className={inputCls} list="inv-rooms" value={f.room || ''} onChange={(e) => set('room', e.target.value)} /></Field>
              <Field label="Shelf or spot"><input className={inputCls} value={f.shelf || ''} onChange={(e) => set('shelf', e.target.value)} /></Field>
              <Field label="Copies"><input className={inputCls} type="number" min={1} value={f.copies ?? 1} onChange={(e) => set('copies', Math.max(1, Number(e.target.value) || 1))} /></Field>
            </div>
            <datalist id="inv-rooms">{rooms.map((r) => <option key={r} value={r} />)}</datalist>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Condition">
                <select className={inputCls} value={f.condition || 'Good'} onChange={(e) => set('condition', e.target.value)}>
                  {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select className={inputCls} value={f.status} onChange={(e) => set('status', e.target.value as ItemStatus)}>
                  {(Object.keys(STATUS_LABEL) as ItemStatus[]).map((t) => <option key={t} value={t}>{STATUS_LABEL[t]}</option>)}
                </select>
              </Field>
            </div>
            {f.status === 'lent' && (
              <Field label="Lent to member number (scan the card, or type)"><input className={inputCls} value={f.lentTo || ''} onChange={(e) => set('lentTo', e.target.value.replace(/\D/g, ''))} inputMode="numeric" /></Field>
            )}
            <Field label="Notes"><textarea className={cn(inputCls, 'min-h-[60px] resize-y')} value={f.notes || ''} onChange={(e) => set('notes', e.target.value)} /></Field>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button type="button" disabled={busy || !(f.name || '').trim()} onClick={() => void onSave(f)}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save</Button>
          {!isNew && f.status === 'lent' && <Button type="button" variant="outline" disabled={busy} onClick={() => void onSave({ ...f, status: 'available', lentTo: '' })}>Returned</Button>}
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          {!isNew && (
            <Button type="button" variant="outline" className="ml-auto text-red-700 dark:text-red-300" disabled={busy} onClick={() => (confirmDel ? onDelete(f.code as string) : setConfirmDel(true))}>
              {confirmDel ? 'Really delete?' : 'Delete'}
            </Button>
          )}
        </div>
        {cam && <Webcam onClose={() => setCam(false)} onShot={(d) => { set('_photo' as keyof Item, d as never); setCam(false) }} />}
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>
}

function Webcam({ onClose, onShot }: { onClose: () => void; onShot: (dataUrl: string) => void }) {
  const video = React.useRef<HTMLVideoElement>(null)
  const [err, setErr] = React.useState('')
  React.useEffect(() => {
    let stream: MediaStream | null = null
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => { stream = s; if (video.current) { video.current.srcObject = s; void video.current.play() } })
      .catch(() => setErr('The camera could not be opened. Allow the camera for this page, or use a file.'))
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [])
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-4">
        {err ? <p className="text-sm font-semibold text-red-700 dark:text-red-300">{err}</p> : <video ref={video} playsInline muted className="w-full rounded-xl bg-black" />}
        <div className="mt-3 flex gap-2">
          <Button type="button" disabled={!!err} onClick={() => { const v = video.current; if (v && v.videoWidth) onShot(shrink(v, v.videoWidth, v.videoHeight)) }}><Camera className="h-4 w-4" /> Take the photo</Button>
          <Button type="button" variant="outline" onClick={onClose}><X className="h-4 w-4" /> Close</Button>
        </div>
      </div>
    </div>
  )
}

/* ---------- stocktake: scan everything in a room, see what is missing ---------- */

function Stocktake({ items, stock, onStop, onMarkMissing }: { items: Item[]; stock: { room: string; seen: Record<string, number>; unknown: string[] }; onStop: () => void; onMarkMissing: (codes: string[]) => void }) {
  const expected = items.filter((i) => (stock.room === 'all' || i.room === stock.room) && i.status !== 'missing' && i.status !== 'lent')
  const found = expected.filter((i) => (stock.seen[i.code] || 0) > 0)
  const missing = expected.filter((i) => !(stock.seen[i.code] || 0))
  const elsewhere = Object.keys(stock.seen).map((c) => items.find((i) => i.code === c)).filter((i): i is Item => !!i && stock.room !== 'all' && i.room !== stock.room)
  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-extrabold">Stocktake: {stock.room === 'all' ? 'the whole space' : stock.room}</h2>
        <span className="text-sm text-muted-foreground">{found.length} of {expected.length} found</span>
        <Button type="button" size="sm" variant="outline" className="ml-auto" disabled={!missing.length} onClick={() => onMarkMissing(missing.map((i) => i.code))}>Mark the {missing.length} not found as missing</Button>
        <Button type="button" size="sm" onClick={onStop}>Finish</Button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <List title="Not found yet" items={missing.map((i) => `${i.name}${i.shelf ? ' · ' + i.shelf : ''}`)} />
        <List title="In the wrong room" items={elsewhere.map((i) => `${i.name} (belongs in ${i.room || 'no room'})`)} />
        <List title="Not in the inventory" items={stock.unknown} />
      </div>
    </div>
  )
}
function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3">
      <div className="mb-1 text-xs font-bold text-muted-foreground">{title} ({items.length})</div>
      <ul className="max-h-40 overflow-y-auto text-sm">{items.length ? items.slice(0, 100).map((t, i) => <li key={i} className="truncate">{t}</li>) : <li className="text-muted-foreground">-</li>}</ul>
    </div>
  )
}

/* ---------- labels to stick on items ---------- */

function LabelsDialog({ items, onClose }: { items: Item[]; onClose: () => void }) {
  const [pick, setPick] = React.useState<Set<string>>(() => new Set(items.filter((i) => !i.barcode).map((i) => i.code)))
  const toggle = (c: string) => setPick((p) => { const n = new Set(p); if (n.has(c)) n.delete(c); else n.add(c); return n })
  const print = () => {
    const chosen = items.filter((i) => pick.has(i.code))
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Labels</title><style>
      @page{margin:6mm}body{margin:0;font-family:Arial,sans-serif}
      .sheet{display:grid;grid-template-columns:repeat(3,62mm);gap:2mm}
      .l{width:62mm;height:30mm;border:0.2mm solid #bbb;padding:2mm 3mm;display:flex;flex-direction:column;justify-content:space-between;break-inside:avoid;overflow:hidden}
      .n{font-size:3.4mm;font-weight:700;line-height:1.15;max-height:8mm;overflow:hidden}
      .b{height:12mm}.b svg{width:100%;height:100%;display:block}
      .c{display:flex;justify-content:space-between;font-size:3mm}
    </style></head><body><div class="sheet">${chosen.map((i) => `<div class="l"><div class="n">${esc(i.name)}</div><div class="b">${code39Svg(i.code, { height: 40 })}</div><div class="c"><b>${i.code}</b><span>${esc(i.room || '')}</span></div></div>`).join('')}</div></body></html>`
    const fr = document.createElement('iframe')
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
    document.body.appendChild(fr)
    fr.srcdoc = html
    fr.onload = () => { setTimeout(() => { fr.contentWindow?.focus(); fr.contentWindow?.print(); setTimeout(() => fr.remove(), 60_000) }, 200) }
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Print labels</DialogTitle>
          <DialogDescription>Each label has the item number as a barcode. Stick it on the item; scanning it opens the item. Items that already have a barcode of their own are not ticked.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 text-xs">
          <button type="button" className="font-bold text-primary" onClick={() => setPick(new Set(items.map((i) => i.code)))}>Tick all</button>
          <button type="button" className="font-bold text-primary" onClick={() => setPick(new Set())}>Tick none</button>
        </div>
        <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-xl border border-border">
          {items.map((i) => (
            <li key={i.code}><label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm"><input type="checkbox" checked={pick.has(i.code)} onChange={() => toggle(i.code)} className="h-4 w-4 accent-[var(--primary)]" /><span className="min-w-0 flex-1 truncate font-semibold">{i.name}</span><span className="text-xs text-muted-foreground">{i.code}</span></label></li>
          ))}
        </ul>
        <div className="flex gap-2"><Button type="button" disabled={!pick.size} onClick={print}><Printer className="h-4 w-4" /> Print {pick.size} labels</Button><Button type="button" variant="outline" onClick={onClose}>Close</Button></div>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- connect the Google Sheet ---------- */

function ConnectDialog({ connected, onClose, onChanged }: { connected: boolean; onClose: () => void; onChanged: () => void }) {
  const [url, setUrl] = React.useState('')
  const [key, setKey] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null)
  const call = async (body: Record<string, unknown>) => {
    setBusy(true); setMsg(null)
    try {
      const r = await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = (await r.json()) as { ok: boolean; msg?: string }
      setMsg({ ok: j.ok, text: j.msg || (j.ok ? 'Done.' : 'Failed.') })
      if (j.ok) { setUrl(''); setKey(''); onChanged() }
    } catch { setMsg({ ok: false, text: 'The app could not be reached.' }) } finally { setBusy(false) }
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Google Sheet</DialogTitle>
          <DialogDescription>
            {connected
              ? 'The inventory is kept in the Inventory tab of the Google Sheet.'
              : 'Until a Sheet is connected, the inventory is kept on this computer. Connecting moves what is here into the Sheet. The steps are in bridge/INVENTORY-SETUP.md.'}
          </DialogDescription>
        </DialogHeader>
        {!connected && (
          <div className="grid gap-3">
            <Field label="Web app address (ends with /exec)"><input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" /></Field>
            <Field label="App key"><input className={inputCls} value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" /></Field>
            <Button type="button" disabled={busy || !url.trim() || !key.trim()} onClick={() => void call({ action: 'connect', url, key })}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />} Test and connect</Button>
          </div>
        )}
        {connected && <Button type="button" variant="outline" disabled={busy} onClick={() => void call({ action: 'disconnect' })}><Unplug className="h-4 w-4" /> Disconnect (items stay in the Sheet)</Button>}
        {msg && <p className={cn('text-sm font-semibold', msg.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300')}>{msg.text}</p>}
      </DialogContent>
    </Dialog>
  )
}
