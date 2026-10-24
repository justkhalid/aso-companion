import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isLocal } from '@/lib/mode'
import { startUninstall } from '@/lib/uninstall'

/**
 * POST /api/uninstall { confirm: 'UNINSTALL', backup: boolean }: removes the app from this computer (folder, Desktop icon,
 * running parts). Admin only, local only. Data saved online (GitHub today) is not touched.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, msg: 'Sign in as admin' }, { status: 401 })
  if (!isLocal()) return NextResponse.json({ ok: false, msg: 'This only works in the app on the director\'s computer.' }, { status: 400 })
  const body = (await req.json().catch(() => ({}))) as { confirm?: string; backup?: boolean }
  if (body.confirm !== 'UNINSTALL') return NextResponse.json({ ok: false, msg: 'Type UNINSTALL to confirm.' }, { status: 400 })
  const dry = process.env.ASO_UNINSTALL_DRY === '1'
  const r = startUninstall(process.cwd(), body.backup !== false, dry)
  if (!r.ok) return NextResponse.json(r, { status: 400 })
  if (!dry) setTimeout(() => process.exit(0), 600)
  return NextResponse.json({ ok: true, msg: r.msg, script: r.script })
}
