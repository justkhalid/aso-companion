import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isLocal } from '@/lib/mode'
import { googleStatus } from '@/lib/google'

/** GET /api/google/status: whether this computer is signed in to Google, and as whom. */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, msg: 'Sign in as admin' }, { status: 401 })
  if (!isLocal()) return NextResponse.json({ ok: true, available: false })
  return NextResponse.json({ ok: true, available: true, ...(await googleStatus()) }, { headers: { 'Cache-Control': 'no-store' } })
}
