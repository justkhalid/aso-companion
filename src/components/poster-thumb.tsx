import { clubIcon } from '@/lib/icons'
import { CalendarDays, Sparkles } from 'lucide-react'

/* the poster at its true A4 ratio, a small tile of the chosen icon when there is none yet */
export function PosterThumb({ poster, alt, icon, kind }: { poster?: string; alt: string; icon?: string; kind: 'club' | 'event' }) {
  const Icon = clubIcon(icon)?.Icon || (kind === 'club' ? Sparkles : CalendarDays)
  return (
    <div className="aspect-[848/1200] w-[84px] shrink-0 overflow-hidden rounded-lg border border-border bg-secondary shadow-sm sm:w-[104px]">
      {poster ? (
        <img src={poster} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
          <Icon className="h-6 w-6" aria-hidden />
          <span className="text-[10px] font-semibold">No poster</span>
        </div>
      )}
    </div>
  )
}
