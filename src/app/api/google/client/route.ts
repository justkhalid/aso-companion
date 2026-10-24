import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isLocal } from '@/lib/mode'
import { saveClientKeys } from '@/lib/google'

/** POST /api/google/client { id, secret }: saves the Client ID and secret of the space's Google project on this computer (encrypted). */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, msg: 'Sign in as admin' }, { status: 401 })
  if (!isLocal()) return NextResponse.json({ ok: false, msg: 'This only works in the app on the director\'s computer.' }, { status: 400 })
  const b = (await req.json().catch(() => ({}))) as { id?: string; secret?: string }
  const r = saveClientKeys(String(b.id || ''), String(b.secret || ''))
  return NextResponse.json(r, { status: r.ok ? 200 : 400 })
}
