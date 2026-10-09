'use client'

import * as React from 'react'
import { Download, LayoutGrid, Image as ImageIcon, ListOrdered, FileText, FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { PngPreviewSheet, useCanvasPngPreview } from '@/components/png-preview-sheet'
import {
  renderTimetablePNG,
  renderPosterPNG,
  renderListPNG,
  type ExportOptions,
} from '@/lib/export-canvas'
import { exportCalendarGridDoc, exportCalendarListDoc } from '@/lib/export-word'

export type ExportVariant = 'grid' | 'poster' | 'list' | 'word-grid' | 'word-list'

/**
 * One menu, five versions of the calendar:
 *  - Weekly grid PNG  (the classic timetable)
 *  - Poster PNG       (bold A4 wall poster)
 *  - Agenda list PNG  (minimal print-friendly list)
 *  - Word table .doc  (landscape, editable, sessions span hour cells)
 *  - Word handout .doc(portrait, one compact table per day)
 *
 * PNG variants render into the preview sheet; Word variants download right away.
 */
export function CalendarExportMenu({
  buildOpts,
  baseName,
  variant = 'outline-button',
}: {
  buildOpts: () => ExportOptions
  /** file name without extension, e.g. "ELTASO_Weekly_Program_2026-2027" */
  baseName: string
  variant?: 'outline-button' | 'pill'
}) {
  const toast = useStore((s) => s.toast)
  const png = useCanvasPngPreview()
  const [busyKind, setBusyKind] = React.useState<ExportVariant | null>(null)

  const runPng = async (kind: ExportVariant) => {
    const opts = buildOpts()
    const suffix = kind === 'grid' ? 'HD' : kind === 'poster' ? 'Poster' : 'List'
    await png.preview(opts, baseName + '_' + suffix + '.png', kind === 'grid' ? renderTimetablePNG : kind === 'poster' ? renderPosterPNG : renderListPNG)
  }

  const runWord = async (kind: ExportVariant) => {
    const opts = buildOpts()
    if (kind === 'word-grid') await exportCalendarGridDoc(opts, baseName + '_Table.doc')
    else await exportCalendarListDoc(opts, baseName + '_Handout.doc')
    toast('Word file downloaded')
  }

  const run = async (kind: ExportVariant) => {
    setBusyKind(kind)
    try {
      if (kind === 'word-grid' || kind === 'word-list') await runWord(kind)
      else await runPng(kind)
    } catch {
      toast('Export failed', false)
    } finally {
      setBusyKind(null)
    }
  }

  const trigger =
    variant === 'pill' ? (
      <button
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-bold text-primary hover:bg-primary/10"
        aria-label="Export calendar"
      >
        {busyKind ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Export
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>
    ) : (
      <Button size="sm" variant="outline" disabled={!!busyKind} aria-label="Export calendar">
        {busyKind ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Export
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </Button>
    )

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 rounded-xl">
          <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Image (PNG)
          </DropdownMenuLabel>
          <MenuRow
            icon={<LayoutGrid className="h-4 w-4" />}
            title="Weekly grid"
            hint="The full timetable, hours across"
            onClick={() => void run('grid')}
            busy={busyKind === 'grid'}
          />
          <MenuRow
            icon={<ImageIcon className="h-4 w-4" />}
            title="Wall poster"
            hint="Bold A4 poster with session blocks"
            onClick={() => void run('poster')}
            busy={busyKind === 'poster'}
          />
          <MenuRow
            icon={<ListOrdered className="h-4 w-4" />}
            title="Agenda list"
            hint="Minimal day-by-day list, print-ready"
            onClick={() => void run('list')}
            busy={busyKind === 'list'}
          />
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Word document
          </DropdownMenuLabel>
          <MenuRow
            icon={<FileSpreadsheet className="h-4 w-4" />}
            title="Editable table"
            hint="Landscape Word grid, sessions in cells"
            onClick={() => void run('word-grid')}
            busy={busyKind === 'word-grid'}
          />
          <MenuRow
            icon={<FileText className="h-4 w-4" />}
            title="One-page handout"
            hint="Portrait Word list, one table per day"
            onClick={() => void run('word-list')}
            busy={busyKind === 'word-list'}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <PngPreviewSheet state={png.state} onOpenChange={png.setOpen} busy={png.busy} />
    </>
  )
}

function MenuRow({
  icon,
  title,
  hint,
  onClick,
  busy,
}: {
  icon: React.ReactNode
  title: string
  hint: string
  onClick: () => void
  busy?: boolean
}) {
  return (
    <DropdownMenuItem onClick={onClick} className="gap-3 rounded-lg py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground/80">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-bold leading-tight">{title}</span>
        <span className="block text-[11.5px] leading-tight text-muted-foreground">{hint}</span>
      </span>
    </DropdownMenuItem>
  )
}
