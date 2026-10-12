'use client'

import * as React from 'react'
import { CalendarDays, LayoutGrid, Table2 } from 'lucide-react'
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { useStore } from '@/lib/store'
import { openMonthExport } from '@/components/month-export-dialog'
import { downloadClubsPng } from '@/lib/clubs-sheet'
import { downloadClubsCalendar, type ClubsCalendarStyle } from '@/lib/clubs-calendar-export'
import type { State } from '@/lib/types'

function Item({ icon: Icon, title, hint, run, done }: { icon: React.ElementType; title: string; hint: string; run: () => Promise<boolean>; done: (ok: boolean) => void }) {
  return (
    <DropdownMenuItem className="items-start gap-3 py-2" onSelect={() => void run().then(done)}>
      <Icon className="mt-0.5 h-4 w-4" aria-hidden />
      <span className="flex flex-col">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
    </DropdownMenuItem>
  )
}

/* the clubs entries of the export menu: the poster board and the calendar-style pages (posters in full) */
export function ClubsExportItems({ state }: { state: State }) {
  const toast = useStore((s) => s.toast)
  const done = (ok: boolean) => toast(ok ? 'Image downloaded' : 'Nothing to export', ok)
  const cal = (style: ClubsCalendarStyle) => () => downloadClubsCalendar(state, style)
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Clubs with posters</DropdownMenuLabel>
      <Item icon={LayoutGrid} title="All clubs on one page" hint="Four per row, posters in full, time and place below" run={() => downloadClubsPng(state)} done={done} />
      <DropdownMenuItem className="items-start gap-3 py-2" onSelect={() => openMonthExport()}>
        <CalendarDays className="mt-0.5 h-4 w-4" aria-hidden />
        <span className="flex flex-col">
          <span className="text-sm font-semibold">Monthly calendar</span>
          <span className="text-xs text-muted-foreground">Pick a month; a calendar with big, readable names</span>
        </span>
      </DropdownMenuItem>
      <Item icon={Table2} title="Weekly calendar with posters" hint="Week timetable on top, every poster in full below" run={cal('grid')} done={done} />
    </>
  )
}
