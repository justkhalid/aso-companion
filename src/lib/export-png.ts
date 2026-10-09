'use client'

import { toPng } from 'html-to-image'

/**
 * Render a DOM node to a PNG data URL. Used by the export preview sheet so
 * the user can see the generated image before downloading.
 */
export async function renderNodePng(node: HTMLElement): Promise<string> {
  const isDark = document.documentElement.classList.contains('dark')
  const bg = isDark ? '#1C1C1E' : '#FFFFFF'
  return toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: bg,
    style: { transform: 'none' },
  })
}

/**
 * Export a DOM node to a downloadable PNG. The node is rendered with a
 * white (or dark) background and downloaded as `<filename>.png`.
 */
export async function exportNodePng(
  node: HTMLElement,
  filename: string,
): Promise<void> {
  const dataUrl = await renderNodePng(node)
  downloadDataUrl(dataUrl, filename)
}

/** trigger a download from a data URL */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** open a data URL in a new browser tab */
export function openDataUrlInNewTab(dataUrl: string) {
  // Open via a blob URL so the new tab can render large images reliably
  // (data URLs can be truncated by some browsers when very long).
  try {
    const blob = dataUrlToBlob(dataUrl)
    const url = URL.createObjectURL(blob)
    const w = window.open(url, '_blank')
    // revoke the blob URL after a short delay so the new tab still has it
    setTimeout(() => URL.revokeObjectURL(url), 30000)
    return !!w
  } catch {
    // fall back to opening the data URL directly
    const w = window.open(dataUrl, '_blank')
    return !!w
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',')
  const mime = (meta.match(/:(.*?);/) || [, 'image/png'])[1]
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

/** build a slug from a string for filenames */
export function slug(s: string): string {
  return String(s || 'export')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}
