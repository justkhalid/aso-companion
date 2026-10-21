import { NextRequest, NextResponse } from 'next/server'
import { readCloudState } from '@/lib/state-store'
import { publicOnly } from '@/lib/mode'
import {
  clearFailures, clientKey, createSessionToken, isThrottled, noteFailure,
  rolesOf, safeEqual, sessionCookie, storedCode, type Role,
} from '@/lib/auth'

/**
 * POST /api/login   body: { code: string, as?: 'admin' | 'teacher' | 'intern', remember?: boolean }
 * Compares the code with the stored code for that role on the server and sets a signed
 * HttpOnly session cookie. A teacher or intern login adds to the roles the visitor already
 * holds (a teacher who also signs in as an intern keeps both). `remember` makes the cookie
 * last 30 days; otherwise it ends with the browser session.
 */
export async function POST(req: NextRequest) {
  const key = clientKey(req)
  if (isThrottled(key)) {
    return NextResponse.json({ ok: false, msg: 'Too many attempts. Try again in a minute.' }, { status: 429 })
  }
  let body: { code?: unknown; remember?: unknown; as?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    /* handled below */
  }
  const code = typeof body.code === 'string' ? body.code.trim() : ''
  if (!code) return NextResponse.json({ ok: false, msg: 'Missing code' }, { status: 400 })
  const role: Role = body.as === 'teacher' || body.as === 'intern' ? body.as : 'admin'
  if (role === 'admin' && publicOnly()) {
    return NextResponse.json({ ok: false, msg: 'The admin is switched off on this website. Sign in on the director\'s computer.' }, { status: 403 })
  }

  const read = await readCloudState({ fresh: true })
  if (!read.ok) {
    return NextResponse.json({ ok: false, msg: read.error || 'Could not read settings' }, { status: 502 })
  }
  if (!safeEqual(code, storedCode(read.state, role))) {
    noteFailure(key)
    return NextResponse.json({ ok: false, msg: role === 'admin' ? 'Wrong admin code' : 'Wrong access code' }, { status: 401 })
  }
  clearFailures(key)
  /* an admin session already covers everything; otherwise add this role to the existing ones */
  const roles = role === 'admin' ? (['admin'] as Role[]) : Array.from(new Set([...rolesOf(req), role]))
  const res = NextResponse.json({ ok: true, roles }, { headers: { 'Cache-Control': 'no-store' } })
  res.cookies.set(sessionCookie(createSessionToken(roles), body.remember === true))
  return res
}
