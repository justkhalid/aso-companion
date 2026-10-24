import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isLocal } from '@/lib/mode'
import { publishRelease } from '@/lib/updates'

export const maxDuration = 300

/** POST /api/update/publish: puts the newest version from GitHub into Google Drive for the installed copies. Developer's computer only (ASO_PUBLISH=1). */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, out: 'Sign in as admin' }, { status: 401 })
  if (!isLocal()) return NextResponse.json({ ok: false, out: 'This only works in the app on a computer.' }, { status: 400 })
  return NextResponse.json(await publishRelease())
}
