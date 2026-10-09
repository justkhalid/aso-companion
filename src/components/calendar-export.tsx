'use client'

import * as React from 'react'
import { Download, LayoutGrid, Image as ImageIcon, CalendarRange, FileText, FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react'
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
  renderWeekStripPNG,
  type ExportOptions,
} from '@/lib/export-canvas'
import { exportCalendarGridDoc, exportCalendarListDoc } from '@/lib/export-word'

export type ExportVariant = 'grid' | 'poster' | 'strip' | 'word-grid' | 'word-list'

/* ---------- PNG text size (zoom) ---------- */

const PNG_ZOOM_KEY = 'aso-png-zoom'
type PngZoom = 1 | 1.3 | 1.6
const PNG_ZOOMS: { v: PngZoom; label: string; hint: string }[] = [
  { v: 1, label: 'Normal', hint: 'Default density' },
  { v: 1.3, label: 'Large', hint: 'Bigger, clearer text' },
  { v: 1.6, label: 'XL', hint: 'Maximum zoom-in' },
]

function readPngZoom(): PngZoom {
  if (typeof window === 'undefined') return 1
  try {
    const v = parseFloat(window.localStorage.getItem(PNG_ZOOM_KEY) || '')
    return v === 1.3 || v === 1.6 ? v : 1
  } catch {
    return 1
  }
}

function writePngZoom(z: PngZoom): void {
  try { window.localStorage.setItem(PNG_ZOOM_KEY, String(z)) } catch { /* private mode */ }
}

/**
 * One menu, five versions of the calendar:
 *  - Weekly grid PNG  (the classic timetable, days as rows)
 *  - Poster PNG       (bold A4 wall poster)
 *  - Week cards PNG  (symmetric day cards, one per day)
 *  - Word table .doc  (A4 portrait, editable, sessions span hour cells)
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
  const [zoom, setZoomState] = React.useState<PngZoom>(1)

  React.useEffect(() => {
    setZoomState(readPngZoom())
  }, [])

  const setZoom = (z: PngZoom) => {
    setZoomState(z)
    writePngZoom(z)
  }

  const runPng = async (kind: ExportVariant) => {
    const opts: ExportOptions = { ...buildOpts(), zoom }
    const suffix = kind === 'grid' ? 'HD' : kind === 'poster' ? 'Poster' : 'WeekCards'
    await png.preview(opts, baseName + '_' + suffix + '.png', kind === 'grid' ? renderTimetablePNG : kind === 'poster' ? renderPosterPNG : renderWeekStripPNG)
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
            PNG text size
          </DropdownMenuLabel>
          <div className="flex items-center gap-1 px-1.5 pb-1.5">
            {PNG_ZOOMS.map((z) => (
              <button
                key={z.v}
                title={z.hint}
                onClick={() => setZoom(z.v)}
                className={
                  'flex-1 rounded-lg border px-2 py-1.5 text-[12px] font-bold transition ' +
                  (zoom === z.v
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground')
                }
              >
                {z.label}
              </button>
            ))}
          </div>
          <DropdownMenuSeparator />
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
            icon={<CalendarRange className="h-4 w-4" />}
            title="Week cards"
            hint="Symmetric day cards, one per day"
            onClick={() => void run('strip')}
            busy={busyKind === 'strip'}
          />
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Word document
          </DropdownMenuLabel>
          <MenuRow
            icon={<FileSpreadsheet className="h-4 w-4" />}
            title="Editable table"
            hint="A4 Word grid, sessions in cells"
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
