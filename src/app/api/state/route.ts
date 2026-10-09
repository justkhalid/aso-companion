import { NextResponse } from 'next/server'
import { readCloudState, getStorageInfo } from '@/lib/state-store'

/**
 * GET /api/state
 * Returns the live app state from the active storage provider.
 *
 * v4.6: primary storage is Vercel Blob (Vercel-native). GitHub is only a
 * legacy fallback while BLOB_READ_WRITE_TOKEN is not configured, and the
 * repo copy seeds the Blob store automatically on first read after
 * migration. The active provider is exposed in the `X-ASO-Storage` header.
 */
export async function GET() {
  const result = await readCloudState()

  if (!result.ok || !result.state) {
    return NextResponse.json(
      { error: result.error || 'Failed to load state' },
      {
        status: 502,
        headers: { 'X-ASO-Storage': getStorageInfo().mode },
      },
    )
  }

  return NextResponse.json(result.state, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-ASO-Storage': result.source,
    },
  })
}
