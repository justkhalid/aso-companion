import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, signValue } from '@/lib/auth'
import { connectWithToken, oauthExchange } from '@/lib/social'

export const maxDuration = 30

/** GET /api/social/callback: Facebook sends the admin back here with a code; it becomes a saved connection. */
export async function GET(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host
  const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')
  const redirectUri = `${proto}://${host}/api/social/callback`
  const back = (q: string) => NextResponse.redirect(new URL(`/admin/clubs/social?social=${q}`, redirectUri))
  const fail = (m: string) => back('error&msg=' + encodeURIComponent(m))
  const u = new URL(req.url)
  if (u.searchParams.get('error')) return fail(u.searchParams.get('error_description') || 'Facebook did not give permission.')
  if (!isAdmin(req)) return fail('Sign in as admin first')
  const state = u.searchParams.get('state') || ''
  const parts = state.split('.')
  const nonce = parts.slice(0, 2).join('.')
  if (parts.length !== 3 || Number(parts[0]) < Date.now() || signValue('social-oauth:' + nonce) !== parts[2]) return fail('The link has expired. Try Connect again.')
  const code = u.searchParams.get('code')
  if (!code) return fail('Facebook did not send a code.')
  const ex = await oauthExchange(code, redirectUri)
  if (!ex.ok || !ex.token) return fail(ex.msg)
  const r = await connectWithToken(ex.token)
  if (r.choose) return fail('This account manages several Pages. Use "Paste a token" and choose the Page there.')
  return r.ok ? back('connected') : fail(r.msg)
}
