import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { isAdmin } from '@/lib/auth'
import { isLocal } from '@/lib/mode'
import { authUrl, googleConfigured } from '@/lib/google'

/** GET /api/google/connect: sends the browser to Google's sign-in page. Admin only, director's computer only. */
export async function GET(req: NextRequest) {
  const home = new URL('/admin', req.nextUrl.origin)
  if (!isAdmin(req)) return NextResponse.redirect(home)
  if (!isLocal() || !googleConfigured()) {
    home.searchParams.set('google', 'unavailable')
    return NextResponse.redirect(home)
  }
  const state = randomBytes(16).toString('hex')
  const res = NextResponse.redirect(authUrl(`${req.nextUrl.origin}/api/google/callback`, state))
  res.cookies.set('aso_gstate', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 })
  return res
}
