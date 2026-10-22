import { posterThumb } from '@/lib/poster-url'
import { clubIcon } from '@/lib/icons'
import { CalendarDays, Sparkles } from 'lucide-react'

/* the poster at the Instagram ratio (4:5), big enough to read; a tile of the chosen icon when there is none yet */
export function PosterThumb({ poster, alt, icon, kind }: { poster?: string; alt: string; icon?: string; kind: 'club' | 'event' }) {
  const Icon = clubIcon(icon)?.Icon || (kind === 'club' ? Sparkles : CalendarDays)
  return (
    <div className="aspect-[4/5] w-[124px] shrink-0 self-start overflow-hidden rounded-xl border border-border bg-secondary shadow-sm sm:w-[168px]">
      {poster ? (
        <img loading="lazy" decoding="async" src={posterThumb(poster, 480)} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
          <Icon className="h-8 w-8" aria-hidden />
          <span className="text-xs font-semibold">No poster yet</span>
        </div>
      )}
    </div>
  )
}
