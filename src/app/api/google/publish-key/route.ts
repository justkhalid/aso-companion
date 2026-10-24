import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isLocal } from '@/lib/mode'
import { googleActive, googleConn } from '@/lib/google'

/** POST /api/google/publish-key: the key GitHub uses to put new app versions into this Drive folder. Admin, director's computer only. */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, msg: 'Sign in as admin' }, { status: 401 })
  if (!isLocal()) return NextResponse.json({ ok: false, msg: 'This only works in the app on the director\'s computer.' }, { status: 400 })
  const c = googleConn()
  if (!googleActive() || !c) return NextResponse.json({ ok: false, msg: 'Sign in with Google first.' }, { status: 400 })
  return NextResponse.json({ ok: true, key: c.refresh }, { headers: { 'Cache-Control': 'no-store' } })
}
