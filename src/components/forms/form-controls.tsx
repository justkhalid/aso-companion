'use client'

import * as React from 'react'
import { Clock, ImagePlus, List, Loader2, PenLine, Trash2 } from 'lucide-react'
import { DAY_KEYS, TIME_OPTIONS } from '@/lib/constants'
import { fmt12Min } from '@/lib/app-utils'
import { CLUB_ICONS, ICON_GROUPS, clubIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/* ---------- day-of-week pills (iOS style toggles) ---------- */
export function DayPills({
  value,
  onChange,
}: {
  value: string[]
  onChange: (days: string[]) => void
}) {
  const set = new Set(value)
  const toggle = (d: string) => {
    const next = new Set(set)
    if (next.has(d)) next.delete(d)
    else next.add(d)
    onChange(Array.from(next))
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {DAY_KEYS.map((d) => {
        const on = set.has(d)
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(d)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95',
              on
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-secondary text-muted-foreground hover:bg-secondary/70',
            )}
          >
            {d}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- two-step time picker (AM/PM) (30-minute steps) ---------- */
export function TimeRangeSelect({
  value,
  onChange,
  defaultStart = '14:00',
  defaultEnd = '16:00',
}: {
  value: string
  onChange: (v: string) => void
  defaultStart?: string
  defaultEnd?: string
}) {
  const [start, end] = React.useMemo(() => {
    const m = String(value || '').match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/)
    if (m) return [padTime(m[1]), padTime(m[2])]
    return ['', '']
  }, [value])

  const valid = (t: string) => TIME_OPTIONS.includes(t)
  const sv = valid(start) ? start : ''
  const ev = valid(end) ? end : ''

  const setStart = (s: string) => {
    const e = ev || defaultEnd
    onChange(sv || s ? `${s || defaultStart}-${e}` : '')
  }
  const setEnd = (e: string) => {
    const s = sv || defaultStart
    onChange(ev || e ? `${s}-${e || defaultEnd}` : '')
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <TimeStep
        id="time-start"
        caption="Starts"
        value={sv}
        fallback={defaultStart}
        onPick={setStart}
      />
      <TimeStep
        id="time-end"
        caption="Ends"
        value={ev}
        fallback={defaultEnd}
        onPick={setEnd}
      />
    </div>
  )
}

function TimeStep({
  id,
  caption,
  value,
  fallback,
  onPick,
}: {
  id: string
  caption: string
  value: string
  fallback: string
  onPick: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {caption}
      </span>
      <Select value={value || fallback} onValueChange={onPick}>
        <SelectTrigger id={id} className="w-full rounded-lg font-semibold tabular-nums">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent className="max-h-64 scroll-thin rounded-lg">
          {TIME_OPTIONS.map((t) => (
            <SelectItem key={t} value={t} className="tabular-nums">
              {fmt12Min(+t.slice(0, 2) * 60 + +t.slice(3, 5))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function padTime(t: string): string {
  const m = String(t || '').match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return t
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

/* ---------- pick from a list, or type your own ---------- */

const NONE = '__aso_none__'
const CUSTOM = '__aso_custom__'

/**
 * A select menu whose options come from the app (rooms, team names, ...)
 * plus an optional "no X yet" empty choice and a "type your own" escape
 * that swaps the select for a free-text input.
 */
export function PickOrType({
  id,
  value,
  onChange,
  options,
  placeholder = 'Pick one',
  emptyLabel,
  customLabel = 'Type your own...',
  backLabel = 'Back to the list',
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  emptyLabel?: string
  customLabel?: string
  backLabel?: string
}) {
  const [customMode, setCustomMode] = React.useState(false)

  // a value that exists in the list always brings the select back
  React.useEffect(() => {
    if (value && options.includes(value)) setCustomMode(false)
  }, [value, options])

  if (customMode) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type it here"
          className="flex-1"
          autoFocus
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title={backLabel}
          aria-label={backLabel}
          className="shrink-0 rounded-lg text-muted-foreground"
          onClick={() => {
            setCustomMode(false)
            onChange('')
          }}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <Select
      value={value || NONE}
      onValueChange={(v) => {
        if (v === CUSTOM) {
          setCustomMode(true)
        } else if (v === NONE) {
          onChange('')
        } else {
          onChange(v)
        }
      }}
    >
      <SelectTrigger id={id} className="w-full rounded-lg font-semibold">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-64 scroll-thin rounded-lg">
        {emptyLabel && <SelectItem value={NONE}>{emptyLabel}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
        <SelectItem value={CUSTOM} className="text-primary">
          <span className="inline-flex items-center gap-1.5">
            <PenLine className="h-3.5 w-3.5" /> {customLabel}
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

/* ---------- where it happens: a room of the space, or somewhere outside ---------- */
export function WhereField({
  id,
  label,
  outside,
  place,
  onChange,
  rooms,
  outsidePlaces,
}: {
  id: string
  label: string
  outside: boolean
  place: string
  onChange: (place: string, outside: boolean) => void
  rooms: string[]
  outsidePlaces: string[]
}) {
  const seg = (on: boolean, text: string, out: boolean) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => !on && onChange('', out)}
      className={cn('rounded-[8px] py-1.5 text-sm transition', on ? 'bg-card font-semibold shadow-sm' : 'text-foreground/70')}
    >
      {text}
    </button>
  )
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="grid grid-cols-2 gap-1 rounded-[10px] bg-secondary p-0.5">
        {seg(!outside, 'At the space', false)}
        {seg(outside, 'Outside', true)}
      </div>
      {outside ? (
        <>
          <Input id={id} list={id + '-places'} value={place} onChange={(e) => onChange(e.target.value, true)} placeholder="City Park, a school, another venue..." />
          <datalist id={id + '-places'}>
            {outsidePlaces.map((p) => <option key={p} value={p} />)}
          </datalist>
          <span className="text-[11px] leading-tight text-muted-foreground">No room is used. It shows on the calendars with a pin and this place.</span>
        </>
      ) : (
        <PickOrType id={id} value={place} onChange={(v) => onChange(v, false)} options={rooms} placeholder="Pick a room" emptyLabel="No room yet" />
      )}
    </div>
  )
}

/* ---------- Lucide icon picker (for club / event chips) ---------- */
export function IconPicker({
  value,
  onChange,
}: {
  value?: string
  onChange: (icon?: string) => void
}) {
  const [q, setQ] = React.useState('')
  const [group, setGroup] = React.useState('All')
  const list = React.useMemo(() => {
    const n = q.trim().toLowerCase()
    return CLUB_ICONS.filter((i) => (n ? i.label.toLowerCase().includes(n) || i.name.includes(n) : group === 'All' || i.group === group))
  }, [q, group])
  return (
    <div className="flex flex-col gap-2">
      <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search icons" aria-label="Search icons" className="h-8" />
      {!q.trim() && (
        <div className="flex flex-wrap gap-1">
          {['All', ...ICON_GROUPS].map((g) => (
            <button key={g} type="button" onClick={() => setGroup(g)} className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', group === g ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary text-muted-foreground hover:text-foreground')}>{g}</button>
          ))}
        </div>
      )}
      <div className="grid max-h-64 grid-cols-8 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-9">
        {list.map(({ name, label, Icon }) => {
          const on = value === name
          return (
            <button
              key={name}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={on}
              onClick={() => onChange(on ? undefined : name)}
              className={cn(
                'flex h-9 w-full items-center justify-center rounded-full border transition-all active:scale-90',
                on
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-secondary text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          )
        })}
        {!list.length && <p className="col-span-full py-3 text-center text-xs text-muted-foreground">No icon with that name.</p>}
      </div>
    </div>
  )
}

/* ---------- poster upload: compress + crop to A4 portrait, store base64 ---------- */
const POSTER_W = 864
const POSTER_H = 1080 // 864x1080 = 4:5, the Instagram frame

export function PosterUploader({
  value,
  onChange,
}: {
  value?: string
  onChange: (poster?: string) => void
}) {
  const [busy, setBusy] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return
    setBusy(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onloadend = () => resolve(String(r.result))
        r.onerror = reject
        r.readAsDataURL(file)
      })
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image()
        im.onload = () => resolve(im)
        im.onerror = () => reject(new Error('bad image'))
        im.src = dataUrl
      })
      // cover-crop to A4 portrait on a canvas
      const cv = document.createElement('canvas')
      cv.width = POSTER_W
      cv.height = POSTER_H
      const ctx = cv.getContext('2d')!
      const scale = Math.max(POSTER_W / img.width, POSTER_H / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, POSTER_W, POSTER_H)
      ctx.drawImage(img, (POSTER_W - w) / 2, (POSTER_H - h) / 2, w, h)
      /* WebP is about half the size of JPEG; a browser that cannot make one answers with PNG, so JPEG is used then */
      const webp = cv.toDataURL('image/webp', 0.8)
      onChange(webp.startsWith('data:image/webp') ? webp : cv.toDataURL('image/jpeg', 0.82))
    } catch {
      // keep the old poster on failure
    } finally {
      setBusy(false)
    }
  }

  if (value) {
    return (
      <div className="flex items-start gap-3">
        <div className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden border border-border shadow-sm">
          <img src={value} alt="Club poster preview" className="block h-full w-full object-cover" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Replace poster
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-lg text-destructive"
            onClick={() => onChange(undefined)}
            disabled={busy}
          >
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
          <span className="text-[11px] text-muted-foreground">Cropped to A4 portrait automatically.</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
            e.target.value = ''
          }}
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={busy}
      className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-6 text-center transition hover:border-primary/40 hover:bg-secondary/70"
    >
      {busy ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <ImagePlus className="h-5 w-5 text-muted-foreground" />
      )}
      <span className="text-xs font-bold text-foreground">
        {busy ? 'Processing...' : 'Add a poster'}
      </span>
      <span className="text-[11px] text-muted-foreground">
        JPG or PNG, cropped to A4 portrait automatically
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
          e.target.value = ''
        }}
      />
    </button>
  )
}

/* ---------- skill tag picker for library folders ---------- */
export function SkillPicker({
  value,
  onChange,
}: {
  value: string[]
  onChange: (sk: string[]) => void
}) {
  const SK = ['L', 'S', 'R', 'W']
  const set = new Set(value)
  const toggle = (k: string) => {
    const next = new Set(set)
    if (next.has(k)) next.delete(k)
    else next.add(k)
    onChange(Array.from(next))
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {SK.map((k) => {
        const on = set.has(k)
        return (
          <button
            key={k}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(k)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95',
              on
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-secondary text-muted-foreground hover:bg-secondary/70',
            )}
          >
            {k}
          </button>
        )
      })}
    </div>
  )
}

/* small helper used by the club dialog to preview the chosen icon */
export function IconPreview({ icon, className }: { icon?: string; className?: string }) {
  const hit = clubIcon(icon)
  if (!hit) return null
  const Icon = hit.Icon
  return <Icon className={cn('h-4 w-4', className)} />
}
