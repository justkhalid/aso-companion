'use client'

import * as React from 'react'

/* things lean towards the cursor: cards tilt a little and buttons drift and grow as the pointer moves over them.
   Off for touch screens and for people who asked their device for less motion. */
export function HoverMotion() {
  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let cur: HTMLElement | null = null
    const release = (el: HTMLElement | null) => {
      if (!el) return
      el.style.transition = 'transform .45s cubic-bezier(.2,.8,.2,1)'
      el.style.transform = ''
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const t = e.target as Element | null
      const el = (t?.closest?.('button:not(:disabled), a[class*="rounded-full"], .bg-card') as HTMLElement | null) || null
      if (!el || el.closest('[data-no-motion]')) {
        if (cur) { release(cur); cur = null }
        return
      }
      const r = el.getBoundingClientRect()
      const isButton = el.tagName === 'BUTTON' || el.tagName === 'A'
      /* big panels (calendars, tables) stay still, only small cards and controls move */
      if (!isButton && (r.width > 520 || r.height > 760)) {
        if (cur) { release(cur); cur = null }
        return
      }
      if (cur !== el) {
        release(cur)
        cur = el
      }
      const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2))
      const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2))
      el.style.transition = 'transform .12s ease-out'
      el.style.transform = isButton
        ? `translate(${(nx * 3).toFixed(1)}px, ${(ny * 2).toFixed(1)}px) scale(1.05)`
        : `perspective(900px) rotateX(${(-ny * 3.5).toFixed(2)}deg) rotateY(${(nx * 3.5).toFixed(2)}deg) translateY(-3px)`
    }
    const onOut = (e: PointerEvent) => {
      if (cur && !cur.contains(e.relatedTarget as Node | null)) {
        release(cur)
        cur = null
      }
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerout', onOut, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerout', onOut)
      release(cur)
    }
  }, [])
  return null
}
