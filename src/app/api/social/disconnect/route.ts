import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { disconnect } from '@/lib/social'

/** POST /api/social/disconnect: forgets the connection kept in the app. Admin only. */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, msg: 'Sign in as admin' }, { status: 401 })
  return NextResponse.json(await disconnect(), { headers: { 'Cache-Control': 'no-store' } })
}
