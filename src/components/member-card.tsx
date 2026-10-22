'use client'

import * as React from 'react'
import { Montserrat } from 'next/font/google'
import { TypedBackground } from '@/components/member-card-bg'

const montserrat = Montserrat({ subsets: ['latin'], weight: ['700'], display: 'swap' })

export type CardType = 'member' | 'staff' | 'teacher' | 'volunteer'
export const CARD_TYPES: { key: CardType; label: string; bg: string }[] = [
  { key: 'member', label: 'Member', bg: '/card/card-background.png' },
  { key: 'staff', label: 'Staff', bg: '/card/card-background-staff.png' },
  { key: 'teacher', label: 'Teacher', bg: '/card/card-background-teacher.png' },
  { key: 'volunteer', label: 'Volunteer', bg: '/card/card-background-volunteer.png' },
]

/* The membership card: the approved background plus the member's details. Positions are the design's own pixels (1012 x 638),
   written as percentages so the card scales to the screen and to the printer. */
const W = 1012
const H = 638
const box = (x: number, y: number, w: number, h: number): React.CSSProperties => ({ position: 'absolute', left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, width: `${(w / W) * 100}%`, height: `${(h / H) * 100}%` })

/* Code 39 (digits only): the same symbology as the "*13150*" values in the sheet */
const PATTERNS: Record<string, string> = { '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw', '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn', '*': 'nwnnwnwnn' }
function Barcode({ value }: { value: string }) {
  const chars = ('*' + String(value).replace(/[^0-9]/g, '') + '*').split('')
  const els: string[] = []
  chars.forEach((ch, i) => { els.push(...PATTERNS[ch].split('')); if (i < chars.length - 1) els.push('n') })
  let x = 0
  const rects: React.ReactNode[] = []
  els.forEach((e, i) => {
    const w = e === 'w' ? 3 : 1
    if (i % 2 === 0) rects.push(<rect key={i} x={x} y={0} width={w} height={10} />)
    x += w
  })
  return <svg viewBox={`0 0 ${x} 10`} preserveAspectRatio="none" fill="#1B2A4E" shapeRendering="crispEdges" role="img" aria-label={`Barcode ${value}`} style={{ width: '100%', height: '100%', display: 'block' }}>{rects}</svg>
}

export const titleCase = (s: string) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase().replace(/(^|[\s\-'])(\p{L})/gu, (_m, a: string, b: string) => a + b.toUpperCase())
export const occupationEn = (s: string) => { const m = String(s || '').match(/[A-Za-z][A-Za-z .\-/]*$/); return m ? m[0].trim() : String(s || '').trim() }
const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')} / ${String(d.getMonth() + 1).padStart(2, '0')} / ${d.getFullYear()}`

export const DEFAULT_ROLE = { staff: 'Staff', teacher: 'English Teacher', volunteer: 'Club Leader' } as const

export interface CardData { nr: number; name: string; occupation: string; photo?: string }

export function MemberCard({ m, type = 'member', issued, role }: { m: CardData; type?: CardType; issued?: Date; role?: string }) {
  const root = React.useRef<HTMLDivElement>(null)
  const typed = type !== 'member'
  const bg = (CARD_TYPES.find((t) => t.key === type) || CARD_TYPES[0]).bg
  const date = fmtDate(issued || new Date())
  const name = titleCase(m.name)
  const job = typed ? role || DEFAULT_ROLE[type as 'staff'] : occupationEn(m.occupation)
  /* a long name shrinks until it fits its line instead of being cut off */
  React.useEffect(() => {
    const fit = () => root.current?.querySelectorAll<HTMLElement>('.val').forEach((el) => {
      el.style.fontSize = '3.36cqw'
      let size = parseFloat(getComputedStyle(el).fontSize)
      while (el.scrollWidth > el.clientWidth + 1 && size > 4) { size *= 0.95; el.style.fontSize = size + 'px' }
    })
    fit()
    void document.fonts?.ready.then(fit)
  }, [name, job, m.nr])
  const val: React.CSSProperties = { display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden', fontSize: '3.36cqw', fontWeight: 700, lineHeight: 1.15, color: '#1B2A4E' }
  return (
    <div ref={root} className={montserrat.className} style={{ position: 'relative', width: '100%', aspectRatio: `${W} / ${H}`, containerType: 'inline-size', overflow: 'hidden', background: '#fff' }}>
      {typed ? <TypedBackground type={type as 'staff' | 'teacher' | 'volunteer'} expires={type !== 'staff'} /> : <img src={bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />}
      <div className="val" style={{ ...box(70, 206, 622, 46), ...val }}>{name}</div>
      <div className="val" style={{ ...box(70, 294, 622, 46), ...val }}>{job}</div>
      <div className="val" style={{ ...box(70, 382, 622, 46), ...val }}>{m.nr}</div>
      <div className="val" style={{ ...box(70, 470, 622, 46), ...val }}>{date}</div>
      <div style={{ ...box(724, 180, 248, 330), overflow: 'hidden' }}>
          {m.photo ? <img src={m.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : null}
      </div>
      <div style={box(70, 548, 300, 44)}><Barcode value={String(m.nr)} /></div>
      <div style={{ ...box(40, 595, 360, 22), display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '.99cqw', fontSize: '1.78cqw', fontWeight: 700, letterSpacing: '.99cqw', color: '#1B2A4E', lineHeight: 1 }}>{m.nr}</div>
    </div>
  )
}
