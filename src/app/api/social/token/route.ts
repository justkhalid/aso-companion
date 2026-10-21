import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { connectWithToken } from '@/lib/social'

export const maxDuration = 30

/** POST /api/social/token { token, pageId? }: checks a pasted token with Meta and keeps the connection, encrypted, on the server. Admin only. */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, msg: 'Sign in as admin' }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as { token?: string; pageId?: string }
  return NextResponse.json(await connectWithToken(String(body.token || ''), body.pageId ? String(body.pageId) : undefined), { headers: { 'Cache-Control': 'no-store' } })
}
