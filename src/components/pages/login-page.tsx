'use client'

import * as React from 'react'
import { LogIn, Eye } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

export function LoginPage() {
  const login = useStore((s) => s.login)
  const setPubView = useStore((s) => s.setPubView)
  const setView = useStore((s) => s.setView)
  const toast = useStore((s) => s.toast)

  const [code, setCode] = React.useState('')
  const [remember, setRemember] = React.useState(true)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const attempt = () => {
    if (!login(code, remember)) {
      toast('Wrong admin code', false)
      return
    }
    toast('Welcome')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="aso-fade-up w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Logo size={72} />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">ASO Companion</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            American Space Oujda · admin sign in
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-code">Access code</Label>
            <Input
              id="admin-code"
              ref={inputRef}
              type="password"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') attempt()
              }}
              placeholder="4 digits"
              className="text-center text-lg tracking-[0.4em]"
            />
          </div>
          <Button className="mt-3 w-full" onClick={attempt}>
            <LogIn className="h-4 w-4" /> Sign in
          </Button>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold">
            <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
            Remember me on this device
          </label>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setPubView(true)
              setView('home')
              toast('Public preview · tap "Back to admin" to return')
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            <Eye className="h-3.5 w-3.5" /> Just browsing? Open the public view
          </button>
        </div>

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          Tip: the default code is 1234 until you change it in Settings.
        </p>
      </div>
    </div>
  )
}
