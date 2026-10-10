'use client'

import * as React from 'react'

/* feeds the pointer position (relative to the card under it) to the CSS glow on .bg-card */
export function CursorGlow() {
  React.useEffect(() => {
    let raf = 0
    let last: PointerEvent | null = null
    const apply = () => {
      raf = 0
      const e = last
      if (!e) return
      const card = (e.target as Element | null)?.closest?.('.bg-card') as HTMLElement | null
      if (!card) return
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', e.clientX - r.left + 'px')
      card.style.setProperty('--my', e.clientY - r.top + 'px')
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      last = e
      if (!raf) raf = requestAnimationFrame(apply)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  return null
}
