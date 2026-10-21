import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { socialStatus } from '@/lib/social'

/** GET /api/social/status: whether Facebook and Instagram are connected, and for how long (never the token). Admin only. */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, msg: 'Sign in as admin' }, { status: 401 })
  return NextResponse.json(await socialStatus(), { headers: { 'Cache-Control': 'no-store' } })
}
