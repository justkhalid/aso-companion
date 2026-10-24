import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isLocal } from '@/lib/mode'
import { completeSignIn } from '@/lib/google'
import { copyGithubToDrive } from '@/lib/google-migrate'
import { readGithubState } from '@/lib/state-store'

export const maxDuration = 300

/** GET /api/google/callback: Google sends the browser back here with a code. */
export async function GET(req: NextRequest) {
  const home = new URL('/admin', req.nextUrl.origin)
  const back = (v: string, msg?: string) => {
    home.searchParams.set('google', v)
    if (msg) home.searchParams.set('gmsg', msg.slice(0, 200))
    const r = NextResponse.redirect(home)
    r.cookies.delete('aso_gstate')
    return r
  }
  if (!isAdmin(req) || !isLocal()) return back('denied')
  const q = req.nextUrl.searchParams
  if (q.get('error')) return back('cancelled')
  const state = q.get('state')
  if (!state || state !== req.cookies.get('aso_gstate')?.value) return back('error', 'The sign-in could not be checked. Try again.')
  const code = q.get('code')
  if (!code) return back('error', 'Google sent no code.')
  const r = await completeSignIn(code, `${req.nextUrl.origin}/api/google/callback`)
  if (!r.ok) return back('error', r.msg)
  /* the data that is in GitHub today moves to Drive once, by itself (it only adds what Drive is missing, and never changes GitHub) */
  try { await copyGithubToDrive(readGithubState) } catch { /* the Settings button can run it again */ }
  return back('ok')
}
