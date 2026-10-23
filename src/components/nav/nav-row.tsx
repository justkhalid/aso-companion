'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { adminPathFor } from '@/lib/url-sync'
import type { NavItem } from '@/lib/nav/menu'

/** where a menu entry points. The tabs of the Social media page carry ?tab=, so the four
 *  of them are four different addresses instead of four names for one. */
export function hrefFor(item: NavItem): string {
  const base = adminPathFor(item.view)
  return item.socialTab ? `${base}?tab=${item.socialTab}` : base
}

/**
 * One row of the menu.
 *
 * It is an <a href> rather than a <button>: the admin URLs already exist, so middle-click,
 * ⌘-click and "copy link address" now work, and the link is announced as a link. A plain
 * click is intercepted and handled by the app, so nothing reloads.
 */
export function NavRow({
  item,
  active,
  badge,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  badge?: number
  onNavigate: (item: NavItem) => void
}) {
  const Icon = item.icon
  return (
    <a
      href={hrefFor(item)}
      aria-current={active ? 'page' : undefined}
      onClick={(e) => {
        /* leave modified clicks (new tab, new window, download) to the browser */
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        onNavigate(item)
      }}
      className={cn(
        'flex items-center gap-2.5 rounded-full px-2.5 py-2 text-left text-[13.5px] font-semibold transition',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        active ? 'aso-nav-pill' : 'text-foreground/80 hover:bg-secondary',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {!!badge && badge > 0 && (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10.5px] font-extrabold leading-none text-primary-foreground">
          <span aria-hidden>{badge}</span>
          {/* a bare "3" after the label is read out as a stray number */}
          <span className="sr-only">{badge === 1 ? '1 item to post' : `${badge} items to post`}</span>
        </span>
      )}
    </a>
  )
}

/** the three rows under the divider: they are not destinations of the menu itself */
export function FooterRow({
  href,
  label,
  icon: Icon,
  active,
  danger,
  onClick,
}: {
  href?: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active?: boolean
  danger?: boolean
  onClick: () => void
}) {
  const className = cn(
    'flex items-center gap-2.5 rounded-full px-2.5 py-2 text-left text-[13.5px] font-semibold transition',
    'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
    danger ? 'text-destructive hover:bg-destructive/10' : active ? 'aso-nav-pill' : 'text-foreground/80 hover:bg-secondary',
  )
  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </>
  )
  if (!href) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    )
  }
  return (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        onClick()
      }}
      className={className}
    >
      {content}
    </a>
  )
}
