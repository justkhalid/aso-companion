import Link from 'next/link'
import { Logo } from '@/components/logo'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <Logo size={56} />
      <div>
        <h1 className="font-display text-[26px] font-extrabold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          This address does not match any page of ASO Companion. The tabs live
          at <span className="font-semibold text-foreground">/</span>,{' '}
          <span className="font-semibold text-foreground">/eltaso</span>,{' '}
          <span className="font-semibold text-foreground">/clubs</span> and{' '}
          <span className="font-semibold text-foreground">/resources</span>.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
      >
        Go to the calendar
      </Link>
    </div>
  )
}
