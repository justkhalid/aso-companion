/**
 * ASO Companion - admin session (server-side only).
 *
 * POST /api/login checks the typed code against the stored adminCode and sets
 * a signed, HttpOnly cookie. POST /api/sync and the full /api/state response
 * require that cookie. The token is `<expiry>.<hmac>`; nothing secret is in it.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

export const SESSION_COOKIE = 'aso_session'
export const SESSION_DAYS = 30
const DEV_SECRET = 'aso-companion-dev-secret-not-for-production'

let ephemeral: string | null = null

function secret(): string {
  const env = process.env.ASO_SESSION_SECRET
  if (env) return env
  /* no dedicated secret: derive one from another server-only secret so
     sessions survive across serverless instances */
  const base = process.env.BLOB_READ_WRITE_TOKEN || process.env.GITHUB_PAT
  if (base) return createHash('sha256').update('aso-session:' + base).digest('hex')
  if (process.env.NODE_ENV !== 'production') return DEV_SECRET
  /* production with nothing configured: random per process (sessions reset on restart) */
  if (!ephemeral) {
    ephemeral = randomBytes(32).toString('hex')
    console.warn('ASO_SESSION_SECRET is not set: admin sessions will not survive restarts.')
  }
  return ephemeral
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function createSessionToken(days = SESSION_DAYS): string {
  const exp = String(Date.now() + days * 86_400_000)
  return `${exp}.${sign(exp)}`
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false
  const [exp, sig] = token.split('.')
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false
  return safeEqual(sig, sign(exp))
}

export function isAdmin(req: NextRequest): boolean {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)
}

export function sessionCookie(token: string, persistent: boolean) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(persistent ? { maxAge: SESSION_DAYS * 86_400 } : {}),
  }
}

/* ---- failed-login throttle (per instance, in memory) ---- */
const fails = new Map<string, { n: number; until: number }>()
const MAX_FAILS = 5
const WINDOW_MS = 60_000

export function clientKey(req: NextRequest): string {
  return (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim()
}
export function isThrottled(key: string): boolean {
  const f = fails.get(key)
  return !!f && f.until > Date.now() && f.n >= MAX_FAILS
}
export function noteFailure(key: string) {
  const now = Date.now()
  const f = fails.get(key)
  fails.set(key, !f || f.until < now ? { n: 1, until: now + WINDOW_MS } : { n: f.n + 1, until: f.until })
}
export function clearFailures(key: string) {
  fails.delete(key)
}

/* ---- secrets in the state ---- */
export const SECRET_KEYS = ['adminCode', 'teacherCode'] as const
export const DEFAULT_ADMIN_CODE = '1234'

type AnyState = { settings?: Record<string, unknown> } & Record<string, unknown>

/** Copy of the state without the access codes (what anonymous visitors get). */
export function stripSecrets<T>(state: T): T {
  const s = state as unknown as AnyState
  if (!s || typeof s !== 'object' || !s.settings) return state
  const settings = { ...s.settings }
  for (const k of SECRET_KEYS) delete settings[k]
  return { ...s, settings } as unknown as T
}

/** Stored admin code, falling back to the seed default when none is set. */
export function storedAdminCode(state: unknown): string {
  const c = (state as AnyState | null)?.settings?.adminCode
  return typeof c === 'string' && c.trim() ? c.trim() : DEFAULT_ADMIN_CODE
}

/** Keep the stored codes when an incoming save omits or blanks them. */
export function keepSecrets(incoming: AnyState, stored: unknown): AnyState {
  const prev = (stored as AnyState | null)?.settings || {}
  const settings = { ...(incoming.settings || {}) }
  for (const k of SECRET_KEYS) {
    const v = settings[k]
    if (typeof v !== 'string' || !v.trim()) {
      if (prev[k] !== undefined) settings[k] = prev[k]
      else delete settings[k]
    }
  }
  return { ...incoming, settings }
}
