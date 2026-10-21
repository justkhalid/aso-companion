import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isLocal } from '@/lib/mode'
import { pullUpdate } from '@/lib/updates'

export const maxDuration = 120

/**
 * POST /api/update/run: pulls the new code, then ends the server with exit code 3. The start file (Start-ASO.bat)
 * sees that code, installs and rebuilds if needed, and starts the app again. Admin only, and only on the director's computer.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, msg: 'Sign in as admin' }, { status: 401 })
  if (!isLocal()) return NextResponse.json({ ok: false, out: 'Updating only works on the director\'s computer.' }, { status: 400 })
  const r = await pullUpdate()
  if (r.ok) setTimeout(() => process.exit(3), 1500)
  return NextResponse.json({ ok: r.ok, out: r.out, restarting: r.ok })
}
