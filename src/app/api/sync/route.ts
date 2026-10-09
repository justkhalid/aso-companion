import { NextRequest, NextResponse } from 'next/server'
import { writeCloudState, getStorageInfo } from '@/lib/state-store'

/**
 * POST /api/sync
 * Saves the app state to the active storage provider.
 *
 * v4.6: with Vercel Blob connected (BLOB_READ_WRITE_TOKEN) this is a pure
 * Vercel-native write: instant, NO git commit, NO redeploy. GitHub is only
 * used as a legacy fallback while Blob is not configured.
 *
 * Request body: { content: string (JSON string of the state) }
 * Response: { ok: boolean, msg: string, mode: StorageMode }
 */
export async function POST(req: NextRequest) {
  try {
    const info = getStorageInfo()

    const body = await req.json()
    const { content, message } = body as { content: string; message?: string }

    if (!content) {
      return NextResponse.json({ ok: false, msg: 'Missing content' }, { status: 400 })
    }

    /* basic sanity check: never overwrite good data with a broken payload */
    try {
      const parsed = JSON.parse(content)
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

    const result = await writeCloudState(content, message)
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (e) {
    return NextResponse.json(
      { ok: false, msg: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
