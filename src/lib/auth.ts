/**
 * ASO Companion - admin session (server-side only).
 *
 * POST /api/login checks the typed code against the stored adminCode and sets
 * a signed, HttpOnly cookie. POST /api/sync and the full /api/state response
 * require that cookie. The token is `<expiry>.<hmac>`; nothing secret is in it.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'
import { publicOnly } from './mode'

export const SESSION_COOKIE = 'aso_session'
export const SESSION_DAYS = 30
const DEV_SECRET = 'aso-companion-dev-secret-not-for-production'

let ephemeral: string | null = null

function secret(): string {
  const env = process.env.ASO_SESSION_SECRET
  if (env) return env
  /* no dedicated secret: derive one from another server-only secret so
     sessions survive across serverless instances */
  /* the GitHub token first: connecting a Blob store later must not change the secret (it would end every sign-in) */
  const base = process.env.GITHUB_PAT || process.env.BLOB_READ_WRITE_TOKEN
  if (base) return createHash('sha256').update('aso-session:' + base).digest('hex')
  if (process.env.NODE_ENV !== 'production') return DEV_SECRET
  /* production with nothing configured: random per process (sessions reset on restart) */
  if (!ephemeral) {
    ephemeral = randomBytes(32).toString('hex')
    console.warn('ASO_SESSION_SECRET is not set: admin sessions will not survive restarts.')
  }
  return ephemeral
}

/** a server secret that stays the same between restarts (needed to keep anything encrypted for later) */
export function hasStableSecret(): boolean {
  return !!(process.env.ASO_SESSION_SECRET || process.env.BLOB_READ_WRITE_TOKEN || process.env.GITHUB_PAT) || process.env.NODE_ENV !== 'production'
}

/** a key derived from the server secret, for one purpose (e.g. 'social') */
export function derivedKey(purpose: string): Buffer {
  return createHash('sha256').update(`aso-${purpose}:` + secret()).digest()
}

export function signValue(payload: string): string {
  return sign(payload)
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

/* roles a session can hold: the admin sees everything, teachers and interns each see their own pages */
export type Role = 'admin' | 'teacher' | 'intern'
const ROLES: Role[] = ['admin', 'teacher', 'intern']

/* token: `<roles joined by +>.<expiry>.<signature>`; the old two-part `<expiry>.<signature>` form is an admin session */
export function createSessionToken(roles: Role[] = ['admin'], days = SESSION_DAYS): string {
  const exp = String(Date.now() + days * 86_400_000)
  const head = roles.join('+') + '.' + exp
  return `${head}.${sign(head)}`
}

export function sessionRoles(token: string | undefined | null): Role[] {
  if (!token) return []
  const parts = token.split('.')
  if (parts.length === 2) {
    const [exp, sig] = parts
    return /^\d+$/.test(exp) && Number(exp) >= Date.now() && safeEqual(sig, sign(exp)) ? ['admin'] : []
  }
  if (parts.length !== 3) return []
  const [rolesPart, exp, sig] = parts
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now() || !safeEqual(sig, sign(rolesPart + '.' + exp))) return []
  return rolesPart.split('+').filter((r): r is Role => (ROLES as string[]).includes(r))
}

export function verifySessionToken(token: string | undefined | null): boolean {
  return sessionRoles(token).includes('admin')
}

export function rolesOf(req: NextRequest): Role[] {
  const roles = sessionRoles(req.cookies.get(SESSION_COOKIE)?.value)
  /* on the public website the admin is switched off: even a valid admin cookie counts for nothing */
  return publicOnly() ? roles.filter((r) => r !== 'admin') : roles
}

export function isAdmin(req: NextRequest): boolean {
  return rolesOf(req).includes('admin')
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
export const SECRET_KEYS = ['adminCode', 'teacherCode', 'internCode'] as const
export const DEFAULT_ADMIN_CODE = '1234'
export const DEFAULT_TEACHER_CODE = 'eltaso2026'
export const DEFAULT_INTERN_CODE = 'aso2026'

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

/** Stored code for a role, falling back to the default when none is set. */
export function storedCode(state: unknown, role: Role): string {
  if (role === 'admin') return storedAdminCode(state)
  const key = role === 'teacher' ? 'teacherCode' : 'internCode'
  const c = (state as AnyState | null)?.settings?.[key]
  /* 'eltaso' was the old placeholder teachers' code in the starter data, never a chosen one: treat it as unset */
  const set = typeof c === 'string' && c.trim() && c.trim() !== 'eltaso'
  return set ? (c as string).trim() : role === 'teacher' ? DEFAULT_TEACHER_CODE : DEFAULT_INTERN_CODE
}

/**
 * What a visitor may receive. The admin gets everything (handled by the caller).
 * Everyone else gets the public part: levels without their weekly plans, the classes,
 * clubs, events and cancellations (without the reasons). Teachers also get the weekly
 * plans, the library and the notes. The copy is marked `_filtered` so a client never saves it back.
 */
export function filterStateFor<T>(state: T, roles: Role[], opts?: { lite?: boolean }): T {
  const s = stripSecrets(state) as unknown as Record<string, unknown> & { levels?: Record<string, unknown>[]; absences?: Record<string, unknown>[] }
  if (!s || typeof s !== 'object') return state
  /* with the teachers' login switched off in Settings, everyone gets what a teacher gets */
  const teacher = !opts?.lite && (roles.includes('teacher') || (s.settings as { teacherLoginRequired?: boolean } | undefined)?.teacherLoginRequired !== true)
  const out: Record<string, unknown> = {
    ...s,
    _filtered: true,
    team: [],
    volunteers: [],
    reports: [],
    prep: {},
    rootUrl: teacher ? s.rootUrl : '',
    library: teacher ? s.library : [],
    libraryPins: teacher ? s.libraryPins : [],
    notes: teacher ? s.notes : [],
    levels: (s.levels || []).map((l) => (teacher ? l : { ...l, weeks: [] })),
    absences: (s.absences || []).map((a) => ({ ...a, reason: '', note: undefined })),
    /* the Social kit settings (captions, framed posters) are for the admin only */
    clubs: ((s.clubs as Record<string, unknown>[] | undefined) || []).map(({ kit: _kit, ...c }) => c),
    events: ((s.events as Record<string, unknown>[] | undefined) || []).map(({ kit: _kit, ...e }) => e),
  }
  return out as unknown as T
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
