import { NextRequest, NextResponse } from 'next/server'
import { gunzipSync } from 'node:zlib'
import { writeCloudState, readCloudState } from '@/lib/state-store'
import { isAdmin, keepSecrets } from '@/lib/auth'

/**
 * POST /api/sync
 * Saves the app state to the active storage provider.
 *
 * v4.6: with Vercel Blob connected (BLOB_READ_WRITE_TOKEN) this is a pure
 * Vercel-native write: instant, NO git commit, NO redeploy. GitHub is only
 * used as a legacy fallback while Blob is not configured.
 *
 * Requires the admin session cookie from POST /api/login (401 otherwise).
 *
 * Request body: the state as JSON, gzipped (header X-ASO-Encoding: gzip), or { content: string } as plain JSON
 * Response: { ok: boolean, msg: string, mode: StorageMode }
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, msg: 'Sign in as admin to save' }, { status: 401 })
  }
  try {
    /* the app sends the data gzipped (a few MB is over Vercel's request limit); a plain JSON body still works */
    let content: string
    let message: string | undefined
    if (req.headers.get('x-aso-encoding') === 'gzip') {
      content = gunzipSync(Buffer.from(await req.arrayBuffer())).toString('utf8')
    } else {
      const body = (await req.json()) as { content: string; message?: string }
      content = body.content
      message = body.message
    }

    if (!content) {
      return NextResponse.json({ ok: false, msg: 'Missing content' }, { status: 400 })
    }

    /* basic sanity check: never overwrite good data with a broken payload */
    let parsed: { v?: number; settings?: Record<string, unknown>; _filtered?: boolean }
    try {
      parsed = JSON.parse(content)
      if (!parsed || parsed.v !== 1) {
        return NextResponse.json(
          { ok: false, msg: 'Refusing to save: payload is not a valid ASO Companion state' },
          { status: 400 },
        )
      }
    } catch {
      return NextResponse.json(
        { ok: false, msg: 'Refusing to save: payload is not valid JSON' },
        { status: 400 },
      )
    }

    /* a copy that was cut down for a visitor (no weekly plans, no library) must never replace the real data */
    if (parsed._filtered) {
      return NextResponse.json({ ok: false, msg: 'Refusing to save a partial copy of the data. Reload as admin first.' }, { status: 400 })
    }

    /* a client that loaded the public (code-less) state must not wipe the stored codes */
    const stored = await readCloudState({ fresh: true })
    const toSave = JSON.stringify(keepSecrets(parsed, stored.state), null, 2)

    const result = await writeCloudState(toSave, message)
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (e) {
    return NextResponse.json(
      { ok: false, msg: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
