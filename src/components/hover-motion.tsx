'use client'

import * as React from 'react'

/* The whole site leans towards the cursor, some things more than others: buttons and badges drift and grow, posters
   shift a little, headings and list rows follow the pointer, cards tilt (small ones more, big panels barely).
   Off for touch screens and for people who asked their device for less motion. */
type Kind = 'button' | 'chip' | 'media' | 'heading' | 'row' | 'card'

const LEAF = 'button:not(:disabled), a[class*="rounded-full"], span[class*="rounded-full"], img, h1, h2, h3, h4, li'

function kindOf(el: HTMLElement): Kind | null {
  const t = el.tagName
  if (t === 'BUTTON' || t === 'A') return 'button'
  if (t === 'SPAN') return 'chip'
  if (t === 'IMG') return 'media'
  if (t === 'H1' || t === 'H2' || t === 'H3' || t === 'H4') return 'heading'
  if (t === 'LI') return 'row'
  return null
}

function transformFor(kind: Kind, r: DOMRect, nx: number, ny: number): string {
  const f = (n: number) => n.toFixed(2)
  switch (kind) {
    case 'button':
      return `translate(${f(nx * 3)}px, ${f(ny * 2)}px) scale(1.05)`
    case 'chip':
      return `translate(${f(nx * 3)}px, ${f(ny * 2)}px) scale(1.08)`
    case 'media':
      return `translate(${f(nx * 4)}px, ${f(ny * 4)}px) scale(${f(1 + 0.035 * Math.min(1, 420 / r.width))})`
    case 'heading':
      return `translate(${f(nx * 4)}px, ${f(ny * 2)}px)`
    case 'row':
      return `translateX(${f(nx * 3)}px)`
    default: {
      /* cards: the smaller the card, the more it tilts and lifts */
      const size = Math.max(r.width, r.height)
      const k = size < 520 ? 1 : size < 900 ? 0.55 : 0.2
      return `perspective(900px) rotateX(${f(-ny * 3.5 * k)}deg) rotateY(${f(nx * 3.5 * k)}deg) translateY(${f(-3 * k)}px)`
    }
  }
}

export function HoverMotion() {
  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let active = new Map<HTMLElement, Kind>()
    let raf = 0
    let last: PointerEvent | null = null

    const release = (el: HTMLElement) => {
      el.style.transition = 'transform .5s cubic-bezier(.2,.8,.2,1)'
      el.style.transform = ''
    }
    const releaseAll = () => {
      active.forEach((_, el) => release(el))
      active = new Map()
    }

    const apply = () => {
      raf = 0
      const e = last
      if (!e) return
      const t = e.target as Element | null
      if (!t || t.closest?.('[data-no-motion]')) {
        releaseAll()
        return
      }
      /* the thing under the pointer, and the card it sits in */
      const next = new Map<HTMLElement, Kind>()
      const leaf = t.closest?.(LEAF) as HTMLElement | null
      if (leaf) {
        const k = kindOf(leaf)
        if (k) next.set(leaf, k)
      }
      const card = t.closest?.('.bg-card') as HTMLElement | null
      if (card && card !== leaf) next.set(card, 'card')
      active.forEach((_, el) => {
        if (!next.has(el)) release(el)
      })
      next.forEach((kind, el) => {
        const r = el.getBoundingClientRect()
        if (!r.width || !r.height) return
        const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2))
        const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2))
        el.style.transition = 'transform .14s ease-out'
        el.style.transform = transformFor(kind, r, nx, ny)
      })
      active = next
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      last = e
      if (!raf) raf = requestAnimationFrame(apply)
    }
    const onLeave = () => {
      last = null
      releaseAll()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
      if (raf) cancelAnimationFrame(raf)
      releaseAll()
    }
  }, [])
  return null
}
