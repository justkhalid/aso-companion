import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { testConnection } from '@/lib/social'

export const maxDuration = 30

/** POST /api/social/test: asks Meta for the Page name and the Instagram account to prove the token works. Admin only. */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, lines: ['Sign in as admin'] }, { status: 401 })
  return NextResponse.json(await testConnection(), { headers: { 'Cache-Control': 'no-store' } })
}
