'use client'

import * as React from 'react'
import { KeyRound } from 'lucide-react'
import { Logo } from './logo'
import { SiteFooter, type Side } from './site-footer'
import { ThemeToggle } from './theme-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/lib/store'

/* The teachers' and interns' pages open with their own access code. The code is checked on the
   server; the page then loads the data meant for that group. */

const COPY = {
  teacher: {
    title: 'Teachers',
    text: 'Weekly plans for every level, the library and the class calendar. Enter the access code you were given.',
    side: 'teachers' as Side,
  },
  intern: {
    title: 'Interns and volunteers',
    text: 'Clubs, events and which rooms are free. Enter the access code you were given.',
    side: 'interns' as Side,
  },
}

export function AccessGate({ role }: { role: 'teacher' | 'intern' }) {
  const loginAs = useStore((s) => s.loginAs)
  const setView = useStore((s) => s.setView)
  const copy = COPY[role]
  const [code, setCode] = React.useState('')
  const [remember, setRemember] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || busy) return
    setBusy(true)
    setError('')
    const r = await loginAs(role, code, remember)
    setBusy(false)
    if (!r.ok) {
      setError(r.msg)
      setCode('')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="aso-nav-glass sticky top-0 z-40 border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
          <button onClick={() => setView('landing')} className="flex items-center gap-2" aria-label="Back to the main page">
            <Logo size={30} />
            <span className="font-display text-[16px] font-extrabold tracking-tight">American Space Oujda</span>
          </button>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">{copy.title}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{copy.text}</p>

          <div className="mt-5 flex flex-col gap-1.5">
            <Label htmlFor="access-code">Access code</Label>
            <Input
              id="access-code"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={code}
              onChange={(e) => { setCode(e.target.value); setError('') }}
              aria-invalid={!!error}
            />
            {error && <p role="alert" className="text-[13px] font-medium text-destructive">{error}</p>}
          </div>

          <label className="mt-3 flex items-center gap-2 text-[13px] text-muted-foreground">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Keep me signed in on this device
          </label>

          <Button type="submit" className="mt-5 w-full rounded-lg" disabled={busy || !code.trim()}>
            {busy ? 'Checking...' : 'Open ' + (role === 'teacher' ? 'the teachers\' pages' : 'the interns\' page')}
          </Button>
          <button type="button" onClick={() => setView('landing')} className="mt-3 w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground">
            Back to the main page
          </button>
        </form>
      </main>

      <SiteFooter current={copy.side} />
    </div>
  )
}
