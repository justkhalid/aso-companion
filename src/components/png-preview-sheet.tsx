'use client'

import * as React from 'react'
import { Download, ExternalLink, Loader2, ImageIcon } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { downloadBlob, openBlobInNewTab, renderTimetablePNG, type ExportOptions } from '@/lib/export-canvas'

export function PngPreviewSheet({
  state,
  onOpenChange,
  busy,
}: {
  state: { open: boolean; blob: Blob | null; filename: string }
  onOpenChange: (open: boolean) => void
  busy?: boolean
}) {
  const [dataUrl, setDataUrl] = React.useState('')

  React.useEffect(() => {
    if (state.blob) {
      const url = URL.createObjectURL(state.blob)
      setDataUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [state.blob])

  return (
    <Sheet open={state.open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg md:max-w-xl">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle className="flex items-center gap-2 text-base font-bold">
            <ImageIcon className="h-4 w-4 text-primary" />
            Export preview
          </SheetTitle>
          <SheetDescription>
            Here is the PNG image generated from the timetable. Download it or open it in a new tab to share or print.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scroll-thin bg-secondary/40 p-4">
          {busy ? (
            <div className="flex h-64 items-center justify-center text-sm font-semibold text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Rendering image...
            </div>
          ) : dataUrl ? (
            <img src={dataUrl} alt="Exported timetable" className="block w-full rounded-lg border border-border bg-white shadow-sm" />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No image generated yet.</div>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border p-4">
          <Button size="sm" disabled={!state.blob || busy} onClick={() => state.blob && downloadBlob(state.blob, state.filename)}>
            <Download className="h-4 w-4" /> Download
          </Button>
          <Button size="sm" variant="outline" disabled={!state.blob || busy} onClick={() => state.blob && openBlobInNewTab(state.blob)}>
            <ExternalLink className="h-4 w-4" /> Open in new tab
          </Button>
          <span className="ml-auto text-xs font-semibold text-muted-foreground">{state.filename}</span>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Hook: call `preview(opts, filename)` to render and show the preview sheet */
export function useCanvasPngPreview() {
  const [state, setState] = React.useState<{ open: boolean; blob: Blob | null; filename: string }>({
    open: false, blob: null, filename: 'export.png',
  })
  const [busy, setBusy] = React.useState(false)

  const preview = React.useCallback(
    async (
      opts: ExportOptions,
      filename: string,
      renderer: (o: ExportOptions) => Promise<Blob | null> = renderTimetablePNG,
    ) => {
      setBusy(true)
      setState({ open: true, blob: null, filename })
      try {
        const blob = await renderer(opts)
        if (blob) {
          setState({ open: true, blob, filename })
        } else {
          setState({ open: false, blob: null, filename })
        }
      } catch (e) {
        console.error('PNG export failed:', e)
        setState({ open: false, blob: null, filename })
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  const setOpen = React.useCallback((open: boolean) => {
    setState((s) => ({ ...s, open }))
  }, [])

  return { state, busy, preview, setOpen }
}
