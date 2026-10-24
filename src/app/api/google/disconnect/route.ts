import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isLocal } from '@/lib/mode'
import { disconnectGoogle } from '@/lib/google'

/** POST /api/google/disconnect: signs this computer out of Google. The files stay in Drive. */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, msg: 'Sign in as admin' }, { status: 401 })
  if (!isLocal()) return NextResponse.json({ ok: false, msg: 'This only works in the app on the director\'s computer.' }, { status: 400 })
  disconnectGoogle()
  return NextResponse.json({ ok: true })
}
