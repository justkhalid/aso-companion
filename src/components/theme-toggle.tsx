'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import type { Theme } from '@/lib/types'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const setSettings = useStore((s) => s.setSettings)
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const isDark = (resolvedTheme || theme) === 'dark'

  const toggle = () => {
    const next: Theme = isDark ? 'light' : 'dark'
    setTheme(next)
    // keep the app settings in sync so the Settings page and reload stay correct
    setSettings((s) => {
      s.theme = next
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
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

/* Keep next-themes in sync with the persisted app settings.theme so reloads
   do not flash the wrong theme and the Settings page reflects the truth. */
export function ThemeSync() {
  const theme = useStore((s) => s.state.settings.theme)
  const { setTheme } = useTheme()
  React.useEffect(() => {
    setTheme(theme === 'auto' ? 'system' : theme)
  }, [theme, setTheme])
  return null
}
