import { NextRequest, NextResponse } from 'next/server'
import { readCloudState, getStorageInfo } from '@/lib/state-store'

/**
 * GET /api/state
 * Returns the live app state from the active storage provider.
 *
 * v4.6: primary storage is Vercel Blob (Vercel-native). GitHub is only a
 * legacy fallback while BLOB_READ_WRITE_TOKEN is not configured, and the
 * repo copy seeds the Blob store automatically on first read after
 * migration. The active provider is exposed in the `X-ASO-Storage` header.
 *
 * Caching: the response carries an ETag built from the state revision, and
 * `no-cache` makes browsers revalidate on every load. When nothing changed
 * they get a tiny 304 and reuse the copy they already hold, instead of
 * downloading the whole state again.
 */
export async function GET(req: NextRequest) {
  /* ?fresh=1 (the admin's "Load now" button) skips the short server memo */
  const result = await readCloudState({ fresh: req.nextUrl.searchParams.get('fresh') === '1' })

  if (!result.ok || !result.state) {
    return NextResponse.json(
      { error: result.error || 'Failed to load state' },
      {
        status: 502,
        headers: { 'X-ASO-Storage': getStorageInfo().mode, 'Cache-Control': 'no-store' },
      },
    )
  }

  const rev = Number((result.state as { _rev?: number })._rev) || 0
  const etag = `W/"rev-${rev}"`
  const headers = {
    'Cache-Control': 'no-cache',
    ETag: etag,
    'X-ASO-Storage': result.source,
  }

  if (rev > 0 && req.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers })
  }
  return NextResponse.json(result.state, { headers })
}
