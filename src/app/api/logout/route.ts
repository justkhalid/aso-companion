import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth'

/** POST /api/logout: clears the admin session cookie. */
export async function POST() {
  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  res.cookies.set({ name: SESSION_COOKIE, value: '', path: '/', maxAge: 0 })
  return res
}
