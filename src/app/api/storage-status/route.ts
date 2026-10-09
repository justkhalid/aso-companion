import { NextResponse } from 'next/server'
import { getStorageInfo } from '@/lib/state-store'

/**
 * GET /api/storage-status
 * Small diagnostic endpoint used by the Settings page so the admin can see
 * exactly where the app data lives and which provider handles saves.
 */
export async function GET() {
  const info = getStorageInfo()
  return NextResponse.json(
    {
      provider: info.mode,
      label: info.label,
      detail: info.detail,
      blobConfigured: info.blobConfigured,
      patConfigured: info.patConfigured,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
