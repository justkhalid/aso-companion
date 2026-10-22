'use client'

import * as React from 'react'
import { Archive, Loader2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/* "Download full kit": one zip with every picture and caption of the clubs and events, and a month calendar if wanted */
export function FullKitButton({ size = 'sm' }: { size?: 'sm' | 'default' }) {
  const state = useStore((s) => s.state)
  const toast = useStore((s) => s.toast)
  const now = new Date()
  const [open, setOpen] = React.useState(false)
  const [clubs, setClubs] = React.useState(true)
  const [events, setEvents] = React.useState(true)
  const [cal, setCal] = React.useState(true)
  const [month, setMonth] = React.useState(now.getMonth())
  const [year, setYear] = React.useState(now.getFullYear())
  const [busy, setBusy] = React.useState('')

  const make = async () => {
    setBusy('Starting')
    try {
      const { buildKitZip } = await import('@/lib/kit/bundle')
      const blob = await buildKitZip(state, {
        clubs,
        events,
        month: cal ? { year, month } : null,
        onProgress: (d, t, label) => setBusy(`${Math.min(d + 1, t)} of ${t}: ${label}`),
      })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `ASO-social-kit-${now.toISOString().slice(0, 10)}.zip`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 4000)
      toast('The kit was downloaded')
      setOpen(false)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The kit could not be made.', false)
    } finally {
      setBusy('')
    }
  }

  const box = 'h-4 w-4 accent-[var(--primary)]'
  return (
    <>
      <Button size={size} variant="outline" onClick={() => setOpen(true)}><Archive className="h-4 w-4" /> Download full kit</Button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download the full kit</DialogTitle>
            <DialogDescription>One zip with a folder for each club and event: the poster, the story, the WhatsApp picture, the highlight cover, the icon and the caption.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-sm">
            <label className="flex items-center gap-2 font-semibold"><input type="checkbox" className={box} checked={clubs} onChange={(e) => setClubs(e.target.checked)} /> All clubs ({state.clubs.filter((c) => !c.placeholder).length})</label>
            <label className="flex items-center gap-2 font-semibold"><input type="checkbox" className={box} checked={events} onChange={(e) => setEvents(e.target.checked)} /> All events ({state.events.length})</label>
            <label className="flex items-center gap-2 font-semibold"><input type="checkbox" className={box} checked={cal} onChange={(e) => setCal(e.target.checked)} /> The month calendar (story and post)</label>
            {cal && (
              <div className="ml-6 flex items-center gap-2">
                <select value={month} onChange={(e) => setMonth(+e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm" aria-label="Month">
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <input type="number" min={2000} max={2200} value={year} onChange={(e) => setYear(Math.min(2200, Math.max(2000, +e.target.value || year)))} className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-sm" aria-label="Year" />
              </div>
            )}
            <p className="text-xs text-muted-foreground">Making the pictures takes a minute or two. Keep this window open.</p>
          </div>
          <Button onClick={() => void make()} disabled={!!busy || (!clubs && !events && !cal)} className="self-start">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />} {busy || 'Make the zip'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* "Links highlight": the story pages with every club group and its QR code, and the round highlight cover */
export function LinksKitButton({ size = 'sm' }: { size?: 'sm' | 'default' }) {
  const state = useStore((s) => s.state)
  const toast = useStore((s) => s.toast)
  const [busy, setBusy] = React.useState(false)
  const make = async () => {
    setBusy(true)
    try {
      const { linksFiles } = await import('@/lib/kit/bundle')
      const { zipFiles } = await import('@/lib/kit/zip')
      const files = await linksFiles(state, 'Links')
      if (!files.length) { toast('No club has a WhatsApp link yet'); return }
      const blob = await zipFiles(files)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'ASO-links-highlight.zip'
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 4000)
      toast('The links highlight was downloaded')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The links highlight could not be made')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button type="button" variant="outline" size={size} disabled={busy} onClick={() => void make()}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />} Links highlight
    </Button>
  )
}
