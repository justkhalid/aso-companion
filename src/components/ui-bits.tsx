'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export function SectionHeader({
  title,
  right,
  className,
}: {
  title: React.ReactNode
  right?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-3 flex items-center gap-2', className)}>
      <h2 className="text-[15px] font-extrabold tracking-tight">{title}</h2>
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  )
}

export function PageHead({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: React.ReactNode
  title: string
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center">
      {icon && <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">{icon}</div>}
      <div className="font-semibold">{title}</div>
      {hint && <div className="mt-1 text-sm text-muted-foreground">{hint}</div>}
    </div>
  )
}

/* a "link button" used as section actions */
export function LinkButton({
  children,
  onClick,
  icon,
}: {
  children: React.ReactNode
  onClick?: () => void
  icon?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-bold text-primary hover:bg-primary/10"
    >
      {icon}
      {children}
    </button>
  )
}

/* a tone chip used in legend / cards */
export function Chip({
  children,
  tone = 'default',
  className,
}: {
  children: React.ReactNode
  tone?: 'default' | 'primary' | 'gold' | 'ok' | 'muted'
  className?: string
}) {
  const styles: Record<string, string> = {
    default: 'bg-secondary text-foreground/80',
    primary: 'bg-primary text-primary-foreground',
    gold: 'text-[var(--aso-gold)] bg-[var(--aso-gold-tint)]',
    ok: 'text-[var(--aso-ok)] bg-[var(--aso-ok-tint)]',
    muted: 'bg-secondary text-muted-foreground',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
        styles[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
