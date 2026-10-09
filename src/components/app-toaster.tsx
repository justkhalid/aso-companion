'use client'

import { useStore } from '@/lib/store'
import { CheckCircle2, Info } from 'lucide-react'

export function AppToaster() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className="aso-fade-up pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl border border-border bg-popover px-4 py-2.5 text-sm font-semibold shadow-lg"
        >
          {t.ok ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Info className="h-4 w-4 text-amber-500" />
          )}
          <span className="text-popover-foreground">{t.msg}</span>
        </button>
      ))}
    </div>
  )
}
