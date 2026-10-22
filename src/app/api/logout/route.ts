import { NextResponse } from 'next/server'
import { SESSION_COOKIE, sessionCookieName } from '@/lib/auth'

/** POST /api/logout: clears the admin session cookie. */
export async function POST() {
  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  for (const name of new Set([SESSION_COOKIE, sessionCookieName()])) res.cookies.set({ name, value: '', path: '/', maxAge: 0 })
  return res
}
