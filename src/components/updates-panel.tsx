'use client'

import * as React from 'react'
import { Check, CircleAlert, Download, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useStore } from '@/lib/store'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

interface LogItem { sha: string; date: string; title: string; note: string }
interface Status {
  changes?: number
  local: boolean
  installed: { sha: string; date: string; version: string } | null
  latest: { sha: string; date: string; version: string } | null
  behind: number | null
  dirty: boolean
  canUpdate: boolean
  log: LogItem[]
  error?: string
}

const day = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

/* Settings > Updates: the installed version, what is new, and (on the director's computer) a button that updates the app */
export function UpdatesPanel() {
  const [st, setSt] = React.useState<Status | null>(null)
  const [state, setState] = React.useState<'ok' | 'signin' | 'error'>('ok')
  const [busy, setBusy] = React.useState(false)
  const [confirm, setConfirm] = React.useState(false)
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null)
  const [restarting, setRestarting] = React.useState(false)
  const [quitMsg, setQuitMsg] = React.useState('')
  const [rm, setRm] = React.useState(false)
  const [rmText, setRmText] = React.useState('')
  const [rmBackup, setRmBackup] = React.useState(true)
  const [rmBusy, setRmBusy] = React.useState(false)
  const [rmMsg, setRmMsg] = React.useState<{ ok: boolean; text: string } | null>(null)

  const load = React.useCallback(async () => {
    setBusy(true)
    try {
      let r = await fetch('/api/update/status', { cache: 'no-store' })
      if (r.status === 401 && useStore.getState().admin && (await useStore.getState().ensureSession())) r = await fetch('/api/update/status', { cache: 'no-store' })
      if (r.status === 401) { setState('signin'); return }
      if (!r.ok) { setState('error'); return }
      setState('ok')
      setSt((await r.json()) as Status)
    } catch {
      setState('error')
    } finally {
      setBusy(false)
    }
  }, [])
  React.useEffect(() => { void load() }, [load])

  const update = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch('/api/update/run', { method: 'POST' })
      const j = (await r.json()) as { ok: boolean; out: string; restarting?: boolean }
      setMsg({ ok: j.ok, text: j.out || (j.ok ? 'Updated.' : 'The update did not work.') })
      if (j.ok && j.restarting) {
        setRestarting(true)
        /* the start file installs and rebuilds, then starts the app again: wait for it, then reload */
        let tries = 0
        const wait = async () => {
          tries++
          try {
            const s = await fetch('/api/session', { cache: 'no-store' })
            if (s.ok && tries > 3) return window.location.reload()
          } catch {
            /* still restarting */
          }
          if (tries < 120) setTimeout(wait, 3000)
          else setRestarting(false)
        }
        setTimeout(wait, 6000)
      }
    } catch {
      setMsg({ ok: false, text: 'The app could not be reached.' })
    } finally {
      setBusy(false)
    }
  }

  const uninstall = async () => {
    setRmBusy(true)
    setRmMsg(null)
    try {
      const r = await fetch('/api/uninstall', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm: rmText.trim(), backup: rmBackup }) })
      const j = (await r.json()) as { ok: boolean; msg: string }
      setRmMsg({ ok: j.ok, text: j.ok ? `ASO Companion is being removed from this computer.${rmBackup ? ' A copy of the data is on the Desktop.' : ''} You can close this window.` : j.msg })
      if (j.ok) setRm(false)
    } catch {
      setRmMsg({ ok: false, text: 'The app could not be reached.' })
    } finally {
      setRmBusy(false)
    }
  }

  if (state === 'signin') {
    return (
      <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
        <p>This device is not signed in to the server, so updates cannot be checked. Sign in again to fix it.</p>
        <Button size="sm" onClick={() => useStore.getState().logout()}>Sign in again</Button>
      </div>
    )
  }
  return (
    <div className="mb-4 flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-extrabold tracking-tight">Version and updates</h2>
        <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => void load()} disabled={busy}>
          {busy && !restarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Check
        </Button>
      </div>

      {state === 'error' && <p className="text-xs text-destructive">The version could not be checked. Try again.</p>}
      {st?.error && <p className="text-xs text-destructive">{st.error}</p>}

      {st && (
        <>
          <div className="rounded-xl bg-secondary/60 p-3 text-sm">
            {st.installed ? (
              <>
                <div className="text-base">Version <b>{st.installed.version ? `v${st.installed.version}` : '?'}</b> installed <span className="text-muted-foreground">(build {st.installed.sha.slice(0, 7)}, {day(st.installed.date)})</span></div>
                <div>Latest: <b>{st.latest?.version ? `v${st.latest.version}` : '?'}</b> <span className="text-muted-foreground">(build {st.latest?.sha.slice(0, 7) || '?'}, {day(st.latest?.date || '')})</span></div>
                <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold">
                  {st.behind === 0 ? <><Check className="h-4 w-4 text-[var(--aso-ok)]" /> You have the latest version.</> : <><CircleAlert className="h-4 w-4 text-[var(--aso-gold)]" /> {st.behind === null ? 'A newer version may be available.' : `${st.behind} newer change${st.behind === 1 ? '' : 's'} available.`}</>}
                </div>
              </>
            ) : (
              <>
                <div>Latest version: <b>{st.latest?.version ? `v${st.latest.version}` : '?'}</b> <span className="text-muted-foreground">(build {st.latest?.sha.slice(0, 7) || '?'}, {day(st.latest?.date || '')})</span></div>
                <p className="mt-1 text-xs text-muted-foreground">{st.local ? 'This folder is not a git copy, so it cannot update itself. Install it with the Start file from the repository.' : 'This is the website. It updates when a new version is published. The admin app on the director\'s computer updates from here, in this same screen.'}</p>
              </>
            )}
          </div>

          {st.local && st.installed && (st.behind ?? 0) > 0 && (
            <div className="flex flex-col gap-2">
              <Button type="button" className="self-start" disabled={!st.canUpdate || busy || restarting} onClick={() => setConfirm(true)}>
                {restarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {restarting ? 'Restarting...' : 'Update now'}
              </Button>
              {st.dirty && <p className="text-xs text-destructive">This copy has changes of its own, so it cannot update by itself.</p>}
            </div>
          )}
          {msg && <p className={`whitespace-pre-wrap text-xs font-semibold ${msg.ok ? 'text-[var(--aso-ok)]' : 'text-destructive'}`}>{msg.text}{restarting ? ' The app is restarting and will reopen in a minute or two. Keep the black window open.' : ''}</p>}

          <div>
            <h3 className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">{st.installed && st.behind !== 0 ? 'What is new' : 'Recent changes'}</h3>
            {st.log.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing to list.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {st.log.map((l) => (
                  <li key={l.sha} className="text-sm">
                    <div className="flex items-baseline gap-2">
                      <b className="min-w-0 flex-1">{l.title}</b>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{day(l.date)} · {l.sha}</span>
                    </div>
                    {l.note && <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">{l.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {st?.local && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-4">
          <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Close the app</h3>
          <p className="text-xs text-muted-foreground">The app keeps running quietly in the background so scheduled posts can go out. Close it here when you are finished for the day. The desktop icon opens it again.</p>
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={async () => { await fetch('/api/quit', { method: 'POST' }).catch(() => undefined); setQuitMsg('The app is closed. You can close this window.') }}>Close the app</Button>
          {quitMsg && <p className="text-xs font-semibold text-[var(--aso-ok)]">{quitMsg}</p>}
        </div>
      )}

      {st?.local && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-4">
          <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Remove from this computer</h3>
          <p className="text-xs text-muted-foreground">Deletes the app, its Desktop icon and everything saved on this computer. Data saved online is not touched, and the app can be installed again later.</p>
          <Button type="button" variant="outline" size="sm" className="self-start border-destructive/40 text-destructive hover:text-destructive" disabled={!!rmMsg?.ok} onClick={() => { setRmText(''); setRm(true) }}>Uninstall and delete the app</Button>
          {rmMsg && <p className={`text-xs font-semibold ${rmMsg.ok ? 'text-[var(--aso-ok)]' : 'text-destructive'}`}>{rmMsg.text}</p>}
        </div>
      )}

      <AlertDialog open={rm} onOpenChange={setRm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete the app from this computer?</AlertDialogTitle>
            <AlertDialogDescription>The app closes and its folder is deleted. This cannot be undone. Node.js and Git stay installed.</AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={rmBackup} onCheckedChange={(v) => setRmBackup(v === true)} /> Put a copy of this computer's data on the Desktop first
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Type UNINSTALL to confirm</span>
            <Input value={rmText} onChange={(e) => setRmText(e.target.value)} placeholder="UNINSTALL" autoComplete="off" />
          </div>
          {rmMsg && !rmMsg.ok && <p className="text-xs font-semibold text-destructive">{rmMsg.text}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={rmText.trim() !== 'UNINSTALL' || rmBusy} className="bg-destructive text-white hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); void uninstall() }}>Delete the app</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update the app?</AlertDialogTitle>
            <AlertDialogDescription>The app downloads the new version and restarts. This takes a minute or two and the page reloads by itself. Your data is not touched.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={() => void update()}>Update</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
