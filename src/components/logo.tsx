import * as React from 'react'

/**
 * ASO Companion brand mark.
 *
 * Uses the official `/aso-logo.png` asset. The image keeps its natural
 * aspect ratio and is rendered with crisp edges on high-DPI screens.
 * A subtle rounded corner keeps the mark feeling like a tile without
 * competing with the content.
 */
export function Logo({
  size = 40,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <img
      src="/aso-logo.png"
      alt="ASO Companion logo"
      width={size}
      height={size}
      className={`block shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  )
}

/** Wordmark used on the splash + login screen. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`}>
      ASO Companion
    </span>
  )
}
