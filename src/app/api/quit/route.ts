import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isLocal } from '@/lib/mode'

/** POST /api/quit: closes the app on the director's computer (the icon opens it again). Admin only, local only. */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, msg: 'Sign in as admin' }, { status: 401 })
  if (!isLocal()) return NextResponse.json({ ok: false, msg: 'This only works in the app on the director\'s computer.' }, { status: 400 })
  setTimeout(() => process.exit(0), 600)
  return NextResponse.json({ ok: true })
}
