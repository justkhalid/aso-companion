import { NextRequest, NextResponse } from 'next/server'
import { readCloudState, getStorageInfo } from '@/lib/state-store'
import { isAdmin, stripSecrets } from '@/lib/auth'

/**
 * GET /api/state
 * Returns the live app state from the active storage provider.
 *
 * v4.6: primary storage is Vercel Blob (Vercel-native). GitHub is only a
 * legacy fallback while BLOB_READ_WRITE_TOKEN is not configured, and the
 * repo copy seeds the Blob store automatically on first read after
 * migration. The active provider is exposed in the `X-ASO-Storage` header.
 *
 * Access codes (settings.adminCode / teacherCode) are only included for
 * requests that carry a valid admin session cookie; everyone else gets the
 * state with those fields removed.
 *
 * Caching: the response carries an ETag built from the state revision, and
 * `no-cache` makes browsers revalidate on every load. When nothing changed
 * they get a tiny 304 and reuse the copy they already hold, instead of
 * downloading the whole state again.
 */
export async function GET(req: NextRequest) {
  /* ?fresh=1 (the admin's "Load now" button) skips the short server memo */
  const admin = isAdmin(req)
  /* ?fresh=1 is admin-only so anonymous traffic cannot bypass the memo */
  const result = await readCloudState({ fresh: admin && req.nextUrl.searchParams.get('fresh') === '1' })

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
  /* admin and public bodies differ, so they must not share an ETag or a cache entry */
  const etag = `W/"rev-${rev}${admin ? '-a' : ''}"`
  const headers = {
    'Cache-Control': admin ? 'private, no-cache' : 'no-cache',
    Vary: 'Cookie',
    ETag: etag,
    'X-ASO-Storage': result.source,
  }

  if (rev > 0 && req.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers })
  }
  return NextResponse.json(admin ? result.state : stripSecrets(result.state), { headers })
}
