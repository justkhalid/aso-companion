'use client'

import { compactSize } from '@/lib/local-db'
import * as React from 'react'
import {
  Sun,
  Moon,
  Smartphone,
  Save,
  DownloadCloud,
  UploadCloud,
  Trash2,
  KeyRound,
  Cloud,
  CalendarDays,
  GraduationCap,
  Database,
  Plus,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { useTheme } from 'next-themes'
import { PageHead } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import type { Theme } from '@/lib/types'

export function SettingsPage() {
  const state = useStore((s) => s.state)
  const setSettings = useStore((s) => s.setSettings)
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const loadFromCloud = useStore((s) => s.loadFromCloud)
  const saveToCloud = useStore((s) => s.saveToCloud)
  const exportBackup = useStore((s) => s.exportBackup)
  const importBackup = useStore((s) => s.importBackup)
  const resetAll = useStore((s) => s.resetAll)
  const syncing = useStore((s) => s.syncing)
  const lastSync = useStore((s) => s.lastSync)

  const { setTheme } = useTheme()
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [newNoteWeek, setNewNoteWeek] = React.useState('')
  const [newNoteText, setNewNoteText] = React.useState('')
  const [storage, setStorage] = React.useState<{
    provider: string
    label: string
    detail: string
    blobConfigured: boolean
  } | null>(null)

  React.useEffect(() => {
    let alive = true
    fetch('/api/storage-status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (alive) setStorage(d)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const [quota, setQuota] = React.useState<{ usage: number; quota: number } | null>(null)
  React.useEffect(() => {
    navigator.storage
      ?.estimate?.()
      .then((e) => setQuota({ usage: e.usage || 0, quota: e.quota || 0 }))
      .catch(() => {})
  }, [state._rev])
  const stateChars = React.useMemo(() => compactSize(state), [state])

  const s = state.settings

  const setThemeVal = (t: Theme) => {
    setSettings((x) => {
      x.theme = t
    })
    setTheme(t === 'auto' ? 'system' : t)
  }

  const onSaveCloud = async () => {
    const r = await saveToCloud()
    toast(r.msg, r.ok)
  }
  const onLoadCloud = async () => {
    const r = await loadFromCloud()
    toast(r.msg, r.ok)
  }

  const onExport = () => {
    const json = exportBackup()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aso-companion-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Backup downloaded')
  }

  const onImport = async (file: File) => {
    const text = await file.text()
    const r = importBackup(text)
    toast(r.msg, r.ok)
  }

  const addNote = () => {
    const wk = parseInt(newNoteWeek, 10)
    if (!wk || !newNoteText.trim()) {
      toast('Set a week number and a note', false)
      return
    }
    patch((draft) => {
      const existing = draft.notes.find((n) => +n.week === wk)
      if (existing) existing.text = newNoteText.trim()
      else draft.notes.push({ week: wk, text: newNoteText.trim() })
    })
    setNewNoteWeek('')
    setNewNoteText('')
    toast('Note saved')
  }

  const removeNote = (wk: number) => {
    patch((draft) => {
      draft.notes = draft.notes.filter((n) => +n.week !== wk)
    })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <PageHead title="Settings" subtitle="Appearance, profile, academic year, access and cloud storage." />

      {/* appearance */}
      <Section title="Appearance" icon={<Sun className="h-4 w-4" />}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Theme</span>
          <div className="ml-auto grid grid-cols-3 gap-1 rounded-full bg-secondary p-1">
            {(['light', 'dark', 'auto'] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => setThemeVal(t)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold capitalize transition',
                  s.theme === t ? 'bg-background shadow-sm' : 'text-muted-foreground',
                )}
              >
                {t === 'light' ? <Sun className="h-3.5 w-3.5" /> : t === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                {t}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* profile */}
      <Section title="Profile" icon={<GraduationCap className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldText label="Coordinator" value={s.coordinator} onChange={(v) => setSettings((x) => { x.coordinator = v })} placeholder="Khalid" />
          <FieldText label="Institute" value={s.institute} onChange={(v) => setSettings((x) => { x.institute = v })} placeholder="American Space Oujda" />
          <FieldText label="Academic year" value={s.year} onChange={(v) => setSettings((x) => { x.year = v })} placeholder="2026-2027" />
          <FieldText label="Country code" value={s.cc} onChange={(v) => setSettings((x) => { x.cc = v })} placeholder="212" />
        </div>
      </Section>

      {/* academic year */}
      <Section title="Academic year" icon={<CalendarDays className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Semester 1 start</Label>
            <Input type="date" value={s.s1Start} onChange={(e) => setSettings((x) => { x.s1Start = e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Semester 2 start</Label>
            <Input type="date" value={s.s2Start} onChange={(e) => setSettings((x) => { x.s2Start = e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Semester 1 weeks</Label>
            <Input
              type="number"
              min={1}
              max={40}
              value={s.s1Weeks}
              onChange={(e) => setSettings((x) => { x.s1Weeks = parseInt(e.target.value, 10) || 15 })}
            />
          </div>
        </div>
      </Section>

      {/* special weeks notes */}
      <Section title="Special weeks" icon={<CalendarDays className="h-4 w-4" />}>
        <div className="flex flex-col gap-3">
          <div className="grid gap-2 sm:grid-cols-[100px_1fr_auto]">
            <Input type="number" min={1} max={40} placeholder="Week" value={newNoteWeek} onChange={(e) => setNewNoteWeek(e.target.value)} />
            <Input placeholder="Note for this week" value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} />
            <Button size="sm" onClick={addNote}><Plus className="h-3.5 w-3.5" /> Add</Button>
          </div>
          {state.notes.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {state.notes
                .slice()
                .sort((a, b) => a.week - b.week)
                .map((n) => (
                  <div key={n.week} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold">W{n.week}</span>
                    <span className="flex-1 text-sm">{n.text}</span>
                    <button onClick={() => removeNote(n.week)} className="text-destructive hover:bg-destructive/10 rounded p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </Section>

      {/* access */}
      <Section title="Access" icon={<KeyRound className="h-4 w-4" />}>
        <FieldText
          label="Admin code (4 digits)"
          value={s.adminCode}
          onChange={(v) => setSettings((x) => { x.adminCode = v })}
          placeholder="1234"
          type="text"
        />
        <div className="mt-2 text-xs text-muted-foreground">
          The code to sign in as the admin. Keep it short and memorable.
        </div>
      </Section>

      {/* cloud storage */}
      <Section title="Cloud storage" icon={<Cloud className="h-4 w-4" />}>
        <div
          className={cn(
            'flex items-start gap-3 rounded-lg border p-3',
            storage?.blobConfigured
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-amber-500/30 bg-amber-500/5',
          )}
        >
          {storage?.blobConfigured ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          )}
          <div className="min-w-0">
            <div className="text-sm font-bold">
              {storage ? storage.label : 'Checking storage…'}
            </div>
            <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {storage
                ? storage.detail
                : 'Asking the server where your data lives.'}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <ToggleRow
            label="Auto-save on every change"
            checked={!!s.ghAutoSave}
            onChange={(v) => setSettings((x) => { x.ghAutoSave = v })}
          />
          <ToggleRow
            label="Auto-load from cloud on boot"
            checked={!!s.ghAutoLoad}
            onChange={(v) => setSettings((x) => { x.ghAutoLoad = v })}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={onSaveCloud} disabled={syncing}>
            <Save className="h-3.5 w-3.5" /> Save now
          </Button>
          <Button size="sm" variant="outline" onClick={onLoadCloud} disabled={syncing}>
            <DownloadCloud className="h-3.5 w-3.5" /> Load now
          </Button>
          <span className="ml-auto self-center text-xs font-semibold text-muted-foreground">
            {s.ghLastSync || lastSync ? `Last sync: ${new Date(s.ghLastSync || lastSync || '').toLocaleString()}` : 'never synced'}
          </span>
        </div>
      </Section>

      {/* data */}
      <Section title="Data" icon={<Database className="h-4 w-4" />}>
        <div className="mb-3 text-xs leading-relaxed text-muted-foreground" data-testid="local-size">
          Local copy: {stateChars.toLocaleString()} characters ({(stateChars / 1_000_000).toFixed(2)} million, compact JSON)
          {quota && quota.quota > 0
            ? `. Browser storage for this site: ${(quota.usage / 1_048_576).toFixed(1)} MB used of ${Math.round(quota.quota / 1_048_576).toLocaleString()} MB.`
            : '.'}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onExport}>
            <UploadCloud className="h-3.5 w-3.5" /> Export backup (JSON)
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <DownloadCloud className="h-3.5 w-3.5" /> Import backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImport(f)
              e.target.value = ''
            }}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> Reset all data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This wipes the local data and restores the sample seed state. The cloud copy is not affected. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    resetAll()
                    toast('Reset to sample state')
                  }}
                >
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          State revision: r{state._rev} · {state.levels.length} levels, {state.classes.length} classes, {state.clubs.length} clubs.
        </div>
      </Section>

      <div className="h-8" />
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</div>
        <h2 className="text-sm font-extrabold tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function FieldText({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border p-2.5">
      <span className="text-sm font-semibold">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} className="ml-auto" />
    </div>
  )
}
