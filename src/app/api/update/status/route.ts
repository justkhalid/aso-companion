import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { updateStatus } from '@/lib/updates'

export const maxDuration = 60

/** GET /api/update/status: the installed version, the latest one and what changed in between. Admin only. */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, msg: 'Sign in as admin' }, { status: 401 })
  return NextResponse.json(await updateStatus(), { headers: { 'Cache-Control': 'no-store' } })
}
