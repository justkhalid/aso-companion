import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { writeMember, connectMembers, disconnectMembers, loadMember, loadMembers, membersAvailable, membersConnected, summarize } from '@/lib/members'

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
 * POST { action: 'savePhoto', nr, dataUrl } or { action: 'markPrinted', nr, by } -> write to the sheet's own app tab
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
  const b = (await req.json().catch(() => ({}))) as { url?: string; key?: string; action?: string; nr?: number; dataUrl?: string; by?: string }
  if (b.action === 'savePhoto' || b.action === 'markPrinted') {
    if (!membersAvailable() || !(await membersConnected())) return NextResponse.json({ ok: false, msg: 'Not connected.' }, { headers })
    const nr = Number(b.nr)
    if (!nr) return NextResponse.json({ ok: false, msg: 'Bad member number.' }, { headers })
    try {
      if (b.action === 'savePhoto') {
        if (!/^data:image\/\w+;base64,/.test(String(b.dataUrl || ''))) return NextResponse.json({ ok: false, msg: 'Bad photo.' }, { headers })
        await writeMember('savePhoto', { nr, dataUrl: String(b.dataUrl) })
      } else await writeMember('markPrinted', { nr, by: String(b.by || 'ASO Companion').slice(0, 120) })
      return NextResponse.json({ ok: true, msg: 'Saved.' }, { headers })
    } catch (e) {
      return NextResponse.json({ ok: false, msg: e instanceof Error ? e.message : 'failed' }, { headers })
    }
  }
  return NextResponse.json(await connectMembers(String(b.url || ''), String(b.key || '')), { headers })
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return no()
  await disconnectMembers()
  return NextResponse.json({ ok: true }, { headers })
}
