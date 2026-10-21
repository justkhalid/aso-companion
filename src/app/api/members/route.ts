import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { connectMembers, disconnectMembers, loadMember, loadMembers, membersAvailable, membersConnected, summarize } from '@/lib/members'

export const maxDuration = 60
const no = () => NextResponse.json({ ok: false, msg: 'Sign in as admin' }, { status: 401 })
const headers = { 'Cache-Control': 'no-store' }

/**
 * GET /api/members            -> { available, connected }
 * GET /api/members?summary=1  -> the counts only (for the dashboard)
 * GET /api/members?month=2026-10 -> how many joined that month
 * GET /api/members?nr=12      -> everything the sheet holds on that member
 * GET /api/members?fresh=1    -> the members, read again from the sheet
 * POST { url, key }           -> connect the sheet. DELETE -> forget it.
 * Admin only, and only in the app on the director's computer: the members are personal data and never go through the website.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return no()
  if (!membersAvailable()) return NextResponse.json({ available: false, connected: false }, { headers })
  const connected = await membersConnected()
  if (!connected) return NextResponse.json({ available: true, connected: false }, { headers })
  const q = new URL(req.url).searchParams
  try {
    if (q.get('nr')) return NextResponse.json({ available: true, connected: true, member: await loadMember(Number(q.get('nr'))) }, { headers })
    const { members, fetchedAt } = await loadMembers(q.get('fresh') === '1')
    if (q.get('month')) return NextResponse.json({ available: true, connected: true, joined: members.filter((m) => m.joined.startsWith(q.get('month') || '~')).length }, { headers })
    if (q.get('summary') === '1') return NextResponse.json({ available: true, connected: true, summary: summarize(members), fetchedAt }, { headers })
    return NextResponse.json({ available: true, connected: true, members, summary: summarize(members), fetchedAt }, { headers })
  } catch (e) {
    return NextResponse.json({ available: true, connected: true, error: e instanceof Error ? e.message : 'failed' }, { headers })
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return no()
  const b = (await req.json().catch(() => ({}))) as { url?: string; key?: string }
  return NextResponse.json(await connectMembers(String(b.url || ''), String(b.key || '')), { headers })
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return no()
  await disconnectMembers()
  return NextResponse.json({ ok: true }, { headers })
}
