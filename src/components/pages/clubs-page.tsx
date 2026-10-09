'use client'

import * as React from 'react'
import {
  Plus,
  Download,
  Pencil,
  Trash2,
  ChevronDown,
  CalendarDays,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  Star,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import {
  toneClassForClub,
  nextOccurrence,
  fmtEventWhen,
  fmtD,
} from '@/lib/app-utils'
import { clubIcon } from '@/lib/icons'
import { WeeklyGrid, type GridItem, type LegendEntry } from '@/components/weekly-grid'
import { ClubDialog } from '@/components/dialogs/club-dialog'
import { EventDialog } from '@/components/dialogs/event-dialog'
import { PageHead, LinkButton, Chip, EmptyState } from '@/components/ui-bits'
import { Button } from '@/components/ui/button'
import { useCanvasPngPreview, PngPreviewSheet } from '@/components/png-preview-sheet'
import type { ExportOptions } from '@/lib/export-canvas'
import { cn } from '@/lib/utils'
import type { Club, EventEntry } from '@/lib/types'

export function ClubsPage({ admin }: { admin: boolean }) {
  const state = useStore((s) => s.state)
  const setView = useStore((s) => s.setView)
  const patch = useStore((s) => s.patch)
  const toast = useStore((s) => s.toast)

  const [clubDialog, setClubDialog] = React.useState<{ open: boolean; club: Club | null }>({ open: false, club: null })
  const [eventDialog, setEventDialog] = React.useState<{ open: boolean; event: EventEntry | null }>({ open: false, event: null })

  const gridRef = React.useRef<HTMLDivElement>(null)
  const png = useCanvasPngPreview()

  const clubItems: GridItem[] = (state.clubs || [])
    .filter((c) => (c.days || []).length && c.time)
    .map((c) => ({
      id: c.id,
      days: c.days,
      slot: c.time,
      code: c.name,
      meta: '',
      lead: c.lead || 'no lead yet',
      room: c.room,
      icon: c.icon,
      tone: toneClassForClub(state, c.id),
    }))
  const clubLegend: LegendEntry[] = (state.clubs || []).map((c) => ({
    label: c.name,
    tone: toneClassForClub(state, c.id),
  }))

  const upcoming = (state.events || [])
    .map((e) => ({ e, d: nextOccurrence(e) }))
    .filter((x) => x.d)
    .sort((a, b) => a.d!.getTime() - b.d!.getTime())

  const deleteClub = (c: Club) => {
    patch((draft) => {
      draft.clubs = draft.clubs.filter((x) => x.id !== c.id)
    })
    toast('Club removed')
  }
  const deleteEvent = (e: EventEntry) => {
    patch((draft) => {
      draft.events = draft.events.filter((x) => x.id !== e.id)
    })
    toast('Event removed')
  }

  const onExport = async () => {
    try {
      const opts: ExportOptions = {
        title: 'ASO - Clubs & Events',
        subtitle: (state.settings.institute || '') + ' - ' + (state.settings.year || '') + ' - ' + (state.clubs || []).length + ' clubs',
        items: clubItems,
        legend: clubLegend,
      }
      const year = (state.settings.year || 'export').replace(/\//g, '-')
      await png.preview(opts, 'ASO_Clubs_Events_Weekly_' + year + '_HD.png')
    } catch {
      toast('PNG export failed', false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <PageHead
        title="Clubs & events"
        subtitle={`The American Space week · club sessions and what is coming up${admin ? '' : ' · open to everyone'}`}
        right={
          <div className="flex flex-wrap gap-2">
            {admin && (
              <Button size="sm" onClick={() => setClubDialog({ open: true, club: null })}>
                <Plus className="h-4 w-4" /> Add club
              </Button>
            )}
            {admin && (
              <Button size="sm" variant="outline" onClick={() => setEventDialog({ open: true, event: null })}>
                <Plus className="h-4 w-4" /> Add event
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onExport}>
              <Download className="h-4 w-4" /> Export PNG
            </Button>
          </div>
        }
      />

      <div ref={gridRef} className="rounded-2xl bg-card">
        {clubItems.length ? (
          <WeeklyGrid items={clubItems} legend={clubLegend} emptyMessage="No club sessions yet" />
        ) : (
          <EmptyState icon={<Sparkles className="h-5 w-5" />} title="No club sessions yet" hint="Club sessions appear here as soon as they are scheduled." />
        )}
      </div>

      {/* upcoming events */}
      <div className="mt-7">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-[15px] font-extrabold tracking-tight">Upcoming events</h2>
          <span className="ml-auto text-xs font-semibold text-muted-foreground">{upcoming.length} events</span>
        </div>
        {upcoming.length ? (
          <div className="grid gap-3">
            {upcoming.map(({ e, d }) => (
              <EventCard
                key={e.id}
                event={e}
                nextDate={d!}
                admin={admin}
                onEdit={() => setEventDialog({ open: true, event: e })}
                onDelete={() => deleteEvent(e)}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="Nothing scheduled" hint="Events land here as soon as they exist." />
        )}
      </div>

      {/* all clubs */}
      <div className="mt-7">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-[15px] font-extrabold tracking-tight">All clubs</h2>
          <span className="ml-auto text-xs font-semibold text-muted-foreground">
            {state.clubs.length} clubs · {state.clubs.reduce((n, c) => n + (c.days || []).length, 0)} sessions / week
          </span>
        </div>
        {state.clubs.length ? (
          <div className="grid gap-3">
            {state.clubs.map((c) => (
              <ClubCard
                key={c.id}
                club={c}
                admin={admin}
                onEdit={() => setClubDialog({ open: true, club: c })}
                onDelete={() => deleteClub(c)}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={<Sparkles className="h-5 w-5" />} title="No clubs yet" hint="Add your first club with the button above." />
        )}
      </div>

      <ClubDialog open={clubDialog.open} onOpenChange={(v) => setClubDialog((s) => ({ ...s, open: v }))} club={clubDialog.club} />
      <EventDialog open={eventDialog.open} onOpenChange={(v) => setEventDialog((s) => ({ ...s, open: v }))} event={eventDialog.event} />
      <PngPreviewSheet state={png.state} onOpenChange={png.setOpen} busy={png.busy} />
    </div>
  )
}

function ClubCard({
  club,
  admin,
  onEdit,
  onDelete,
}: {
  club: Club
  admin: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const days = (club.days || []).length ? club.days.join(' / ') : 'no day set'
  const time = club.time || 'no time set'
  const room = club.room || ''
  const vol = (club.vol || []).join(', ')

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col sm:flex-row">
        {/* poster on the left (170px) */}
        <div className="flex h-44 shrink-0 items-center justify-center bg-secondary sm:h-auto sm:w-[170px]">
          {club.poster ? (
            <img src={club.poster} alt={`${club.name} poster`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              {(() => {
                const Icon = clubIcon(club.icon)?.Icon || Sparkles
                return <Icon className="h-7 w-7" />
              })()}
            </div>
          )}
        </div>

        {/* content on the right */}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold">{club.name}</h3>
            {club.placeholder && <Chip tone="gold">placeholder</Chip>}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {days}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {time}</span>
            {room && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {room}</span>}
          </div>
          <div className="text-xs">
            {club.lead ? (
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <User className="h-3.5 w-3.5" /> Lead: {club.lead}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-[var(--aso-gold)]">
                <AlertTriangle className="h-3.5 w-3.5" /> Needs a lead
              </span>
            )}
          </div>

          {/* learn more expandable */}
          <div>
            <button
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary"
            >
              <ChevronDown className={cn('h-3.5 w-3.5 transition', open && 'rotate-180')} />
              {open ? 'Hide' : 'Learn more'}
            </button>
            {open && (
              <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2 text-[13px]">
                {club.desc && (
                  <div><span className="font-bold text-muted-foreground">About:</span> {club.desc}</div>
                )}
                {vol && (
                  <div><span className="font-bold text-muted-foreground">Volunteers:</span> {vol}</div>
                )}
                {club.url && (
                  <div>
                    <span className="font-bold text-muted-foreground">Link:</span>{' '}
                    <a href={club.url} target="_blank" rel="noopener" className="font-semibold text-primary hover:underline">
                      {club.url}
                    </a>
                  </div>
                )}
                {!club.desc && !vol && !club.url && (
                  <div className="text-muted-foreground">No extra details yet.</div>
                )}
              </div>
            )}
          </div>

          {/* actions */}
          <div className="flex items-center gap-2 pt-1">
            {admin ? (
              <>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </>
            ) : (
              club.url && (
                <a href={club.url} target="_blank" rel="noopener">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-3.5 w-3.5" /> Open link
                  </Button>
                </a>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EventCard({
  event,
  nextDate,
  admin,
  onEdit,
  onDelete,
}: {
  event: EventEntry
  nextDate: Date
  admin: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const when = fmtEventWhen(event)
  const isWeekly = event.recur === 'weekly'
  const nextStr = fmtD(nextDate, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--aso-gold-tint)] bg-card shadow-sm">
      <div className="flex flex-col sm:flex-row">
        {/* gold poster area */}
        <div className="flex h-44 shrink-0 items-center justify-center bg-gradient-to-br from-[var(--aso-gold-tint)] to-secondary sm:h-auto sm:w-[170px]">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--aso-gold-tint)] text-[var(--aso-gold)]">
            <CalendarDays className="h-7 w-7" />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold">{event.title}</h3>
            <Chip tone={isWeekly ? 'gold' : 'primary'}>{when}</Chip>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {nextStr}</span>
            {event.time && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {event.time}</span>}
          </div>
          {event.place && (
            <div className="text-xs font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {event.place}</span>
            </div>
          )}

          <div>
            <button
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary"
            >
              <ChevronDown className={cn('h-3.5 w-3.5 transition', open && 'rotate-180')} />
              {open ? 'Hide' : 'Learn more'}
            </button>
            {open && (
              <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2 text-[13px]">
                {event.desc && (
                  <div><span className="font-bold text-muted-foreground">About:</span> {event.desc}</div>
                )}
                {isWeekly && event.day && (
                  <div><span className="font-bold text-muted-foreground">Repeats:</span> Every {event.day}</div>
                )}
                {!isWeekly && event.date && (
                  <div><span className="font-bold text-muted-foreground">Date:</span> {event.date}</div>
                )}
                {!event.desc && !((isWeekly && event.day) || (!isWeekly && event.date)) && (
                  <div className="text-muted-foreground">No extra details.</div>
                )}
              </div>
            )}
          </div>

          {admin && (
            <div className="flex items-center gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
