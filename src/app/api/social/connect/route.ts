import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { isAdmin, signValue } from '@/lib/auth'
import { OAUTH_SCOPES, socialConfig } from '@/lib/social'

/** where Meta sends the person back to: this site, whatever address it is opened on */
function callbackUrl(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host
  const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}/api/social/callback`
}

/** GET /api/social/connect: sends the admin to Facebook to say yes; Facebook sends them back to /api/social/callback. */
export async function GET(req: NextRequest) {
  const back = (q: string) => NextResponse.redirect(new URL(`/admin/clubs/social?social=${q}`, callbackUrl(req)))
  if (!isAdmin(req)) return back('error&msg=' + encodeURIComponent('Sign in as admin first'))
  const c = await socialConfig()
  if (!c.appId || !c.appSecret) return back('error&msg=' + encodeURIComponent('META_APP_ID and META_APP_SECRET are not set in Vercel.'))
  const nonce = `${Date.now() + 600_000}.${randomBytes(8).toString('hex')}`
  const state = `${nonce}.${signValue('social-oauth:' + nonce)}`
  const url = new URL(`https://www.facebook.com/${c.version}/dialog/oauth`)
  url.searchParams.set('client_id', c.appId)
  url.searchParams.set('redirect_uri', callbackUrl(req))
  url.searchParams.set('state', state)
  url.searchParams.set('scope', OAUTH_SCOPES)
  url.searchParams.set('response_type', 'code')
  return NextResponse.redirect(url)
}
