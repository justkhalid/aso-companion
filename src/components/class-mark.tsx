import { Blocks, Briefcase, Headphones, SignalHigh, SignalLow, SignalMedium } from 'lucide-react'
import type { ClassMark } from '@/lib/class-marks'
import type { ElementType } from 'react'

/* kids: building blocks, teens: headphones, adults: briefcase; level: one, two or three bars of signal */
export const AUDIENCE_ICON: Record<ClassMark['audience'], ElementType> = { Kids: Blocks, Teens: Headphones, Adults: Briefcase }
export const LEVEL_ICON: Record<1 | 2 | 3, ElementType> = { 1: SignalLow, 2: SignalMedium, 3: SignalHigh }

/* the pair shown on a class chip */
export function ClassMarkIcons({ mark, className, style }: { mark: ClassMark; className?: string; style?: React.CSSProperties }) {
  const A = AUDIENCE_ICON[mark.audience]
  const L = mark.step ? LEVEL_ICON[mark.step] : null
  return (
    <span className="inline-flex shrink-0 items-center gap-px" title={`${mark.audience}${mark.step ? ', ' + ['', 'beginner', 'intermediate', 'advanced'][mark.step] : ''}`}>
      <A className={className} style={style} aria-hidden />
      {L && <L className={className} style={style} aria-hidden />}
    </span>
  )
}
