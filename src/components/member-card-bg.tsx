'use client'

import * as React from 'react'
import { Cairo, Montserrat } from 'next/font/google'

const mont = Montserrat({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' })
const cairo = Cairo({ subsets: ['arabic', 'latin'], weight: ['600', '700', '800'], display: 'swap' })

export type TypedKind = 'staff' | 'teacher' | 'volunteer'
const NAVY = '#1B2A4E'
const RED = '#C8102E'
const INK = '#4A5878'
const RULE = '#9AA5B8'
const FLAG = '#006233'

const TYPE: Record<TypedKind, { color: string; ar: string; en: string }> = {
  staff: { color: NAVY, ar: 'بطاقة الموظف', en: 'STAFF CARD' },
  teacher: { color: '#0B6B3A', ar: 'بطاقة الأستاذ', en: 'TEACHER CARD' },
  volunteer: { color: '#D9480F', ar: 'بطاقة المتطوع', en: 'VOLUNTEER CARD' },
}

/* a line of text that squeezes itself to its width when the font runs wide */
function Fit({ max, children, ...rest }: React.SVGProps<SVGTextElement> & { max: number }) {
  const ref = React.useRef<SVGTextElement>(null)
  React.useEffect(() => {
    const run = () => {
      const el = ref.current
      if (!el) return
      el.removeAttribute('textLength')
      el.removeAttribute('lengthAdjust')
      if (el.getComputedTextLength() > max) { el.setAttribute('textLength', String(max)); el.setAttribute('lengthAdjust', 'spacingAndGlyphs') }
    }
    run()
    void document.fonts?.ready.then(run)
  }, [children, max])
  return <text ref={ref} {...rest}>{children}</text>
}

const star8 = (cx: number, cy: number, s: number, fill: string) => (
  <g fill={fill} transform={`translate(${cx} ${cy}) scale(${s})`}><rect x="-5" y="-5" width="10" height="10" /><rect x="-5" y="-5" width="10" height="10" transform="rotate(45)" /></g>
)

/* The same card as the member card (header, four rows, photo spot, barcode, title), with a background of its own per type:
   the side bands differ (plain, star column, scallops) and the colour carries to the photo frame, barcode corners and title.
   Everything sits on the member card's grid, so the values drawn over it line up on all four cards. */
export function TypedBackground({ type, expires }: { type: TypedKind; expires: boolean }) {
  const t = TYPE[type]
  const c = t.color
  const ar = { fontFamily: cairo.style.fontFamily, fontWeight: 700 } as const
  const en = { fontFamily: mont.style.fontFamily } as const
  const rows = [
    { top: 178, en: 'NAME', ar: 'الاسم الكامل' },
    { top: 266, en: 'ROLE', ar: 'المهمة' },
    { top: 354, en: 'ID NUMBER', ar: 'رقم التعريف' },
    { top: 442, en: expires ? 'VALID UNTIL' : 'DATE ISSUED', ar: expires ? 'صالحة إلى غاية' : 'تاريخ الإصدار' },
  ]
  const bar = true
  const edge = type === 'volunteer' ? NAVY : RED
  return (
    <svg viewBox="0 0 1012 638" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
      <image href="/aso-logo.png" x="788" y="14" width="120" height="128" preserveAspectRatio="xMidYMid meet" />
      <text x="692" y="74" textAnchor="end" fontSize="62" textLength="652" lengthAdjust="spacingAndGlyphs" style={{ ...ar, fontWeight: 800 }} fill={RED}>الفضاء الأمريكي بوجدة</text>
      <text x="692" y="132" textAnchor="end" fontSize="46" textLength="652" lengthAdjust="spacingAndGlyphs" style={{ ...en, fontWeight: 800 }} fill={NAVY}>AMERICAN SPACE OUJDA</text>
      <rect x="40" y="154" width="650" height="4" fill={RED} />
      <rect x="726" y="154" width="246" height="4" fill={RED} />
      <rect x="40" y="162" width="650" height="2" fill={NAVY} />
      <rect x="726" y="162" width="246" height="2" fill={NAVY} />
      <path transform="translate(708 159) scale(.65)" d="M0 -14 L8.23 11.33 L-13.31 -4.33 L13.31 -4.33 L-8.23 11.33 Z" fill="none" stroke="#0B6B3A" strokeWidth="3.2" />
      {rows.map((r) => (
        <g key={r.top}>
          {star8(48, r.top + 12, 0.78, RED)}
          <text x="70" y={r.top + 15} fontSize="18" letterSpacing="2.5" style={{ ...en, fontWeight: 700 }} fill={INK}>{r.en}</text>
          <text x="692" y={r.top + 12} textAnchor="end" fontSize="21" style={{ ...ar, fontWeight: 600 }} fill={RED}>{r.ar}</text>
          <rect x="40" y={r.top + 79.5} width="652" height="2.5" fill={RULE} />
        </g>
      ))}
      {bar && (
        <g>
          <rect x="0" y="522" width="1012" height="116" fill={c} />
          <rect x="0" y="522" width="1012" height="4" fill={edge} />
          <rect x="40" y="536" width="360" height="88" rx="6" fill="#fff" />
        </g>
      )}
      <rect x="725.5" y="181.5" width="245" height="327" fill="#fff" stroke={c} strokeWidth="3" />
      {!bar && <g stroke={c} strokeWidth="3.5" fill="none">
        <path d="M41.75 558 V537.75 H62" /><path d="M378 537.75 H398.25 V558" /><path d="M41.75 602 V622.25 H62" /><path d="M378 622.25 H398.25 V602" />
      </g>}
      <Fit max={330} x="972" y="579" textAnchor="end" fontSize="56" style={{ ...ar, fontWeight: 800 }} fill={bar ? '#fff' : c}>{t.ar}</Fit>
      <text x="972" y="619" textAnchor="end" fontSize="32" style={{ ...en, fontWeight: 800 }} fill={bar ? '#fff' : NAVY}>{t.en}</text>
    </svg>
  )
}
