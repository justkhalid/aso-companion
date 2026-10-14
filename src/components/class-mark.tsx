import { Briefcase, GraduationCap, Shapes } from 'lucide-react'
import type { ClassMark } from '@/lib/class-marks'
import type { ElementType } from 'react'

/* kids: shapes, teens: graduation cap, adults: briefcase; level: three dots, one, two or three of them filled */
export const AUDIENCE_ICON: Record<ClassMark['audience'], ElementType> = { Kids: Shapes, Teens: GraduationCap, Adults: Briefcase }

/* the pair shown on a class chip; the dots take the size of the icon next to them */
export function ClassMarkIcons({ mark, className, style }: { mark: ClassMark; className?: string; style?: React.CSSProperties }) {
  const A = AUDIENCE_ICON[mark.audience]
  return (
    <span className="inline-flex shrink-0 items-center gap-[3px]" title={`${mark.audience}${mark.step ? ', ' + ['', 'beginner', 'intermediate', 'advanced'][mark.step] : ''}`}>
      <A className={className} style={style} aria-hidden />
      {mark.step > 0 && (
        <span className="inline-flex items-center gap-[1.5px]" aria-hidden>
          {[1, 2, 3].map((k) => (
            <i key={k} className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: 'currentColor', opacity: k <= mark.step ? 1 : 0.28, ...style }} />
          ))}
        </span>
      )}
    </span>
  )
}
