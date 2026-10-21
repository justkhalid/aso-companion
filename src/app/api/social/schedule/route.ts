import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { cancelJob, createJob, listJobs } from '@/lib/social-schedule'

export const maxDuration = 60

const no = () => NextResponse.json({ ok: false, msg: 'Sign in as admin' }, { status: 401 })

/** GET /api/social/schedule: the scheduled posts (waiting and finished). Admin only. */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return no()
  return NextResponse.json({ ok: true, jobs: await listJobs() }, { headers: { 'Cache-Control': 'no-store' } })
}

/**
 * POST /api/social/schedule (multipart form): the same fields as /api/social/publish, plus
 *   at: ISO time to post, label: what it is, kind: picture | animation
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return no()
  try {
    const f = await req.formData()
    const file = (k: string) => { const v = f.get(k); return v instanceof Blob && v.size > 0 ? v : null }
    const at = String(f.get('at') || '')
    const t = new Date(at).getTime()
    if (!at || Number.isNaN(t)) return NextResponse.json({ ok: false, msg: 'Choose a date and time.' }, { status: 400 })
    if (t < Date.now() - 60_000) return NextResponse.json({ ok: false, msg: 'That time has already passed.' }, { status: 400 })
    if (t > Date.now() + 366 * 86400_000) return NextResponse.json({ ok: false, msg: 'Choose a time within a year.' }, { status: 400 })
    const tg = JSON.parse(String(f.get('targets') || '{}')) as Record<string, boolean>
    const targets = { igFeed: !!tg.igFeed, igStory: !!tg.igStory, fbFeed: !!tg.fbFeed, fbStory: !!tg.fbStory }
    if (!Object.values(targets).some(Boolean)) return NextResponse.json({ ok: false, msg: 'Tick at least one place to post.' }, { status: 400 })
    const r = await createJob({
      at,
      label: String(f.get('label') || 'Post').slice(0, 120),
      targets,
      kind: f.get('kind') === 'animation' ? 'animation' : 'picture',
      caption: String(f.get('caption') || ''),
      story: file('story'),
      poster: file('poster'),
      poster45: file('poster45'),
      video: file('video'),
    })
    return NextResponse.json(r, { status: r.ok ? 200 : 500 })
  } catch (e) {
    return NextResponse.json({ ok: false, msg: e instanceof Error ? e.message : 'failed' }, { status: 500 })
  }
}

/** DELETE /api/social/schedule?id=...: take a scheduled post off the list. Admin only. */
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return no()
  const id = new URL(req.url).searchParams.get('id') || ''
  return NextResponse.json(await cancelJob(id))
}
