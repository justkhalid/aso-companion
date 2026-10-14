import * as React from 'react'
import { cn } from '@/lib/utils'

/* Every poster on the site gets the same finish on top: a soft shade at the top edge and the logo in a white
   badge in the top right corner. The poster itself is untouched. Sizes follow the poster's width. */
export function PosterFrame({ className, children, style }: { className?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className={cn('relative overflow-hidden', className)} style={{ containerType: 'inline-size', ...style }}>
      {children}
      <PosterOverlay />
    </div>
  )
}

/* for a poster box that is already positioned: put this inside it (the box needs container-type: inline-size) */
export function PosterOverlay() {
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[28%] bg-gradient-to-b from-black/40 to-transparent" />
      <span
        aria-hidden
        className="pointer-events-none absolute flex items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,.3)]"
        style={{ width: '15cqw', height: '15cqw', top: '4cqw', right: '4cqw' }}
      >
        <img src="/aso-logo.webp" alt="" draggable={false} className="h-[68%] w-[68%] object-contain" />
      </span>
    </>
  )
}
