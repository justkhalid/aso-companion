import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isLocal } from '@/lib/mode'
import { googleActive } from '@/lib/google'
import { copyGithubToDrive } from '@/lib/google-migrate'
import { readGithubState } from '@/lib/state-store'

export const maxDuration = 300

/** POST /api/google/migrate: copies what GitHub holds (data, Instagram connection, posters, scheduled posts) into Drive. */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, msg: 'Sign in as admin' }, { status: 401 })
  if (!isLocal() || !googleActive()) return NextResponse.json({ ok: false, msg: 'Sign in to Google first.' }, { status: 400 })
  const r = await copyGithubToDrive(readGithubState)
  return NextResponse.json(r, { status: r.ok ? 200 : 500 })
}
