'use client'

import * as React from 'react'
import { ArrowRight, CalendarDays, CheckCircle2, Send } from 'lucide-react'
import { useStore } from '@/lib/store'
import { postQueue, reasonText, type QueueItem } from '@/lib/post-queue'
import { Chip } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'

const whenText = (q: QueueItem) => (q.daysAway === 0 ? 'Today' : q.daysAway === 1 ? 'Tomorrow' : q.when.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }))

/* clubs and events that happen soon and still need a post; one tap opens their pictures and posting */
export function PostQueue({ compact }: { compact?: boolean }) {
  const state = useStore((s) => s.state)
  const openSocial = useStore((s) => s.openSocial)
  const queue = React.useMemo(() => postQueue(state), [state])
  const shown = compact ? queue.slice(0, 5) : queue

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
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{q.name}</span>
            <span className="text-xs text-muted-foreground">{whenText(q)} · {reasonText[q.reason]}</span>
          </span>
          <Chip tone={q.reason === 'changed' ? 'gold' : 'primary'} icon={q.kind === 'club' ? CalendarDays : CalendarDays}>{q.kind === 'club' ? 'Club' : 'Event'}</Chip>
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
