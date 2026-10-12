'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const isDark = (resolvedTheme || theme) === 'dark'

  const toggle = () => {
    /* the choice belongs to this device; the site opens in light mode for everyone else */
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      /* title only after mount: avoids an SSR/client mismatch */
      title={mounted ? (isDark ? 'Switch to light mode' : 'Switch to dark mode') : undefined}
      className={`rounded-full ${className}`}
      onClick={toggle}
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-[18px] w-[18px]" />
        ) : (
          <Moon className="h-[18px] w-[18px]" />
        )
      ) : (
        <span className="h-[18px] w-[18px]" />
      )}
    </Button>
  )
}
