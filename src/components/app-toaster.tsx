'use client'

import { useStore } from '@/lib/store'
import { CheckCircle2, Info } from 'lucide-react'

/* messages are announced to screen readers; a message with an action (Undo) stays longer */
export function AppToaster() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="aso-fade-up pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl border border-border bg-popover px-4 py-2.5 text-sm font-semibold shadow-lg"
        >
          {t.ok ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
          ) : (
            <Info className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
          )}
          <span className="text-popover-foreground">{t.msg}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.run()
                dismiss(t.id)
              }}
              className="rounded-full px-2.5 py-1 text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t.action.label}
            </button>
          )}
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss message"
            className="rounded-full px-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
