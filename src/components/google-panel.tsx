'use client'

import * as React from 'react'
import { CheckCircle2, CircleAlert, HardDrive, Loader2, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useStore } from '@/lib/store'

interface Status { available?: boolean; configured?: boolean; connected?: boolean; email?: string; files?: number; error?: string }

/* Settings > Data and backup: the space's Google account. Signing in moves the data into the "ASO Companion" folder of its Drive. */
export function GooglePanel() {
  const toast = useStore((s) => s.toast)
  const [st, setSt] = React.useState<Status | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [keyId, setKeyId] = React.useState('')
  const [keySecret, setKeySecret] = React.useState('')
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null)

  const load = React.useCallback(async () => {
    try {
      const r = await fetch('/api/google/status', { cache: 'no-store' })
      if (r.ok) setSt((await r.json()) as Status)
    } catch { /* offline */ }
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => { void load() }, [load])

  /* the website has no Google sign-in: it belongs to the app on the director's computer */
  if (!st || st.available === false) return null

  const saveKeys = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch('/api/google/client', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: keyId, secret: keySecret }) })
      const j = (await r.json()) as { ok: boolean; msg: string }
      if (j.ok) { setKeySecret(''); await load() } else setMsg({ ok: false, text: j.msg })
    } catch {
      setMsg({ ok: false, text: 'The app could not be reached.' })
    } finally {
      setBusy(false)
    }
  }
  const copy = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch('/api/google/migrate', { method: 'POST' })
      const j = (await r.json()) as { ok: boolean; msg: string }
      setMsg({ ok: j.ok, text: j.msg })
      void load()
    } catch {
      setMsg({ ok: false, text: 'The app could not be reached.' })
    } finally {
      setBusy(false)
    }
  }
  const out = async () => {
    setBusy(true)
    await fetch('/api/google/disconnect', { method: 'POST' }).catch(() => undefined)
    toast('Signed out of Google on this computer. The files stay in Drive.', true)
    await load()
    setBusy(false)
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <HardDrive className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-extrabold tracking-tight">Google account</h2>
      </div>
      {!st.configured ? (
        <>
          <p className="text-xs text-muted-foreground">This computer needs the Client ID and Client secret of the space&apos;s Google project, once. They are in Google Cloud under Google Auth Platform, then Clients. They are kept encrypted on this computer.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={keyId} onChange={(e) => setKeyId(e.target.value)} placeholder="Client ID (ends with .apps.googleusercontent.com)" autoComplete="off" />
            <Input value={keySecret} onChange={(e) => setKeySecret(e.target.value)} placeholder="Client secret" type="password" autoComplete="off" />
          </div>
          <Button type="button" size="sm" className="self-start" disabled={busy || !keyId.trim() || !keySecret.trim()} onClick={() => void saveKeys()}>Save the keys</Button>
        </>
      ) : st.connected ? (
        <>
          <div className={`flex items-start gap-2 rounded-xl p-3 text-sm ${st.error ? 'bg-destructive/10' : 'bg-secondary/60'}`}>
            {st.error ? <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--aso-ok)]" />}
            <div className="min-w-0">
              <div className="font-bold">{st.error ? 'Signed in, but Drive cannot be reached' : 'Signed in'}{st.email ? ` as ${st.email}` : ''}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{st.error || `The data lives in the "ASO Companion" folder of this Drive (${st.files ?? 0} ${st.files === 1 ? 'file' : 'files'}).`}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void copy()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDrive className="h-4 w-4" />} Copy everything from GitHub to Drive
            </Button>
            {st.error && <Button type="button" size="sm" asChild><a href="/api/google/connect">Sign in again</a></Button>}
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void out()}><LogOut className="h-4 w-4" /> Sign out on this computer</Button>
          </div>
          <p className="text-xs text-muted-foreground">Copying only adds what is missing in Drive and never deletes anything on GitHub. Do it once, after the first sign-in.</p>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">Sign in with the space&apos;s Google account. The data, the posters and the Instagram connection then live in its Drive, and any computer that signs in with the same account sees the same data.</p>
          <Button type="button" size="sm" className="self-start" asChild><a href="/api/google/connect">Sign in with Google</a></Button>
        </>
      )}
      {msg && <p className={`text-xs font-semibold ${msg.ok ? 'text-[var(--aso-ok)]' : 'text-destructive'}`}>{msg.text}</p>}
    </div>
  )
}
