import { NextRequest, NextResponse } from 'next/server'
import { rolesOf } from '@/lib/auth'

/** GET /api/session: which roles the visitor's cookie holds (admin, teacher, intern). */
export async function GET(req: NextRequest) {
  return NextResponse.json({ roles: rolesOf(req) }, { headers: { 'Cache-Control': 'no-store' } })
}
