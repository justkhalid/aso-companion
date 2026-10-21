import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { publish } from '@/lib/social'

export const maxDuration = 60

/**
 * POST /api/social/publish (multipart form)
 *   targets: JSON { igFeed, igStory, fbFeed, fbStory }
 *   caption: text
 *   story, poster, poster45: pictures (JPEG)
 * Posts to the Facebook Page and the Instagram account. Admin only. Answers { ok, steps: [{ label, ok, msg }] }.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, steps: [{ label: 'Sign in', ok: false, msg: 'Sign in as admin first' }] }, { status: 401 })
  try {
    const f = await req.formData()
    const file = (k: string) => {
      const v = f.get(k)
      return v instanceof Blob && v.size > 0 ? v : null
    }
    const t = JSON.parse(String(f.get('targets') || '{}')) as Record<string, boolean>
    const targets = { igFeed: !!t.igFeed, igStory: !!t.igStory, fbFeed: !!t.fbFeed, fbStory: !!t.fbStory }
    if (!Object.values(targets).some(Boolean)) return NextResponse.json({ ok: false, steps: [{ label: 'Nothing chosen', ok: false, msg: 'Tick at least one place to post.' }] }, { status: 400 })
    const out = await publish({ targets, caption: String(f.get('caption') || ''), story: file('story'), poster: file('poster'), poster45: file('poster45') })
    return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ ok: false, steps: [{ label: 'Server', ok: false, msg: e instanceof Error ? e.message : 'failed' }] }, { status: 500 })
  }
}
