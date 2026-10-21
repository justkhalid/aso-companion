import { NextRequest, NextResponse } from 'next/server'
import { rolesOf } from '@/lib/auth'
import { isLocal, publicOnly } from '@/lib/mode'

/** GET /api/session: which roles the visitor's cookie holds (admin, teacher, intern). */
export async function GET(req: NextRequest) {
  return NextResponse.json({ roles: rolesOf(req), adminEnabled: !publicOnly(), local: isLocal() }, { headers: { 'Cache-Control': 'no-store' } })
}
