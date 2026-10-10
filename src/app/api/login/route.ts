import { NextRequest, NextResponse } from 'next/server'
import { readCloudState } from '@/lib/state-store'
import {
  clearFailures, clientKey, createSessionToken, isThrottled, noteFailure,
  safeEqual, sessionCookie, storedAdminCode,
} from '@/lib/auth'

/**
 * POST /api/login   body: { code: string, remember?: boolean }
 * Compares the code with the stored admin code on the server and sets a signed
 * HttpOnly session cookie. `remember` makes the cookie last 30 days; otherwise
 * it ends with the browser session.
 */
export async function POST(req: NextRequest) {
  const key = clientKey(req)
  if (isThrottled(key)) {
    return NextResponse.json({ ok: false, msg: 'Too many attempts. Try again in a minute.' }, { status: 429 })
  }
  let body: { code?: unknown; remember?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    /* handled below */
  }
  const code = typeof body.code === 'string' ? body.code.trim() : ''
  if (!code) return NextResponse.json({ ok: false, msg: 'Missing code' }, { status: 400 })

  const read = await readCloudState({ fresh: true })
  if (!read.ok) {
    return NextResponse.json({ ok: false, msg: read.error || 'Could not read settings' }, { status: 502 })
  }
  if (!safeEqual(code, storedAdminCode(read.state))) {
    noteFailure(key)
    return NextResponse.json({ ok: false, msg: 'Wrong admin code' }, { status: 401 })
  }
  clearFailures(key)
  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  res.cookies.set(sessionCookie(createSessionToken(), body.remember === true))
  return res
}
