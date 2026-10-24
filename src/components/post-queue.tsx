'use client'

import * as React from 'react'
import { ArrowRight, CalendarDays, CheckCircle2, ImagePlus, Send, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { postQueue, reasonText, type QueueItem } from '@/lib/post-queue'
import { Chip } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { kitRec } from '@/lib/kit/derive'
import { posterThumb } from '@/lib/poster-url'
import { isoOf } from '@/lib/app-utils'

const whenText = (q: QueueItem) => (q.daysAway === 0 ? 'Today' : q.daysAway === 1 ? 'Tomorrow' : q.when.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }))

/* clubs and events that happen soon and still need a post; one tap opens their pictures and posting */
export function PostQueue({ compact }: { compact?: boolean }) {
  const state = useStore((s) => s.state)
  const openSocial = useStore((s) => s.openSocial)
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)
  const setSkip = (q: QueueItem, skip: string | undefined) =>
    patch((d) => {
      const t = q.kind === 'club' ? d.clubs.find((c) => c.id === q.id) : d.events.find((e) => e.id === q.id)
      if (t) t.kit = { ...(t.kit || {}), skip }
    })
  const dismiss = (q: QueueItem) => {
    setSkip(q, isoOf(q.when))
    toast(q.name + ' removed from To post.', true, { label: 'Undo', run: () => setSkip(q, undefined) })
  }
  const queue = React.useMemo(() => postQueue(state), [state])
  const shown = compact ? queue.slice(0, 5) : queue
  /* the poster of a queue entry, so the list shows what is about to be posted */
  const posterOf = (q: QueueItem) => {
    const item = q.kind === 'club' ? state.clubs.find((c) => c.id === q.id) : state.events.find((e) => e.id === q.id)
    if (!item) return ''
    const R = kitRec(q.kind, item)
    return R.sitePoster ? posterThumb(R.sitePoster, 160) : R.poster || ''
  }

  if (queue.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-[var(--aso-ok)]" aria-hidden /> Nothing to post. Every club and event that is coming up has its post.
      </p>
    )
  }
  return (
    <ul className="grid gap-1.5">
      {shown.map((q) => (
        <li key={q.kind + q.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-card px-3 py-2">
          {!compact && (
            <span className="grid aspect-[3/4] w-11 shrink-0 place-items-center overflow-hidden bg-secondary">
              {posterOf(q) ? <img src={posterOf(q)} alt="" className="h-full w-full object-contain" loading="lazy" /> : <ImagePlus className="h-4 w-4 text-muted-foreground" aria-hidden />}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{q.name}</span>
            <span className="text-xs text-muted-foreground">{whenText(q)} · {reasonText[q.reason]}</span>
          </span>
          <Chip tone={q.reason === 'changed' ? 'gold' : 'primary'} icon={q.kind === 'club' ? CalendarDays : CalendarDays}>{q.kind === 'club' ? 'Club' : 'Event'}</Chip>
          <Button size="sm" variant="ghost" onClick={() => dismiss(q)} aria-label={'Dismiss ' + q.name} title="Not posting this one">
            <X className="h-4 w-4" /> Dismiss
          </Button>
          <Button size="sm" onClick={() => openSocial(q.kind, { kind: q.kind, id: q.id })}>
            <Send className="h-4 w-4" /> Post
          </Button>
        </li>
      ))}
      {compact && queue.length > shown.length && (
        <li>
          <button onClick={() => openSocial('todo')} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
            {queue.length - shown.length} more <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </li>
      )}
    </ul>
  )
}
