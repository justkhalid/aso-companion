import { NextRequest, NextResponse } from 'next/server'
import { gzipSync } from 'node:zlib'
import { readCloudState, getStorageInfo } from '@/lib/state-store'
import { filterStateFor, rolesOf } from '@/lib/auth'

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
  const roles = rolesOf(req)
  const admin = roles.includes('admin')
  /* the body depends on who asks, so the ETag and caches are keyed by role */
  const roleKey = admin ? '-a' : (roles.includes('teacher') ? '-t' : '')
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
  const etag = `W/"rev-${rev}${roleKey}"`
  const headers = {
    'Cache-Control': roleKey ? 'private, no-cache' : 'no-cache',
    Vary: 'Cookie',
    ETag: etag,
    'X-ASO-Storage': result.source,
  }

  if (rev > 0 && req.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers })
  }
  const body = admin ? result.state : filterStateFor(result.state, roles)
  /* the full data is several MB and Vercel caps a function's answer at 4.5 MB: send it compressed (about half the size) */
  if ((req.headers.get('accept-encoding') || '').includes('gzip')) {
    let zipped = zipCache.get(etag)
    if (!zipped) {
      zipped = gzipSync(Buffer.from(JSON.stringify(body)), { level: 6 })
      if (zipCache.size >= 6) zipCache.delete(zipCache.keys().next().value as string)
      zipCache.set(etag, zipped)
    }
    return new NextResponse(new Uint8Array(zipped), {
      headers: { ...headers, Vary: 'Cookie, Accept-Encoding', 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' },
    })
  }
  return NextResponse.json(body, { headers })
}

/* compressed copies by revision and role, so a burst of visitors compresses once */
const zipCache = new Map<string, Buffer>()
