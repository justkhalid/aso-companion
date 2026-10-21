/* The members of the ASO library, read from the Google Sheet through its Apps Script link (server only).
   The link and its key are kept encrypted on the director's computer only (data/members.enc.json, never sent to GitHub),
   or read from MEMBERS_SCRIPT_URL and MEMBERS_SCRIPT_KEY. Member data is never saved anywhere: it is fetched when the page opens. */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { derivedKey } from './auth'
import { isLocal } from './mode'

const FILE = 'data/members.enc.json'

export interface Member {
  nr: number
  name: string
  occupation: string
  date: string // when the person joined
  q: unknown // the sheet's "q" column
  cardPrinted: boolean
  hasPhoto: boolean
  banned: boolean
  duplicates: number[] // numbers of members that look like the same person
}

interface Conn { url: string; key: string; savedAt: string }

function seal(c: Conn): string {
  const iv = randomBytes(12)
  const k = createCipheriv('aes-256-gcm', derivedKey('members'), iv)
  const data = Buffer.concat([k.update(JSON.stringify(c), 'utf8'), k.final()])
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: k.getAuthTag().toString('base64'), data: data.toString('base64') })
}
function unseal(text: string): Conn | null {
  try {
    const j = JSON.parse(text) as { iv: string; tag: string; data: string }
    const d = createDecipheriv('aes-256-gcm', derivedKey('members'), Buffer.from(j.iv, 'base64'))
    d.setAuthTag(Buffer.from(j.tag, 'base64'))
    return JSON.parse(Buffer.concat([d.update(Buffer.from(j.data, 'base64')), d.final()]).toString('utf8')) as Conn
  } catch {
    return null
  }
}

async function conn(): Promise<Conn | null> {
  if (!isLocal()) return null
  try {
    const { readFile } = await import('node:fs/promises')
    const c = unseal(await readFile(FILE, 'utf8'))
    if (c) return c
  } catch {
    /* none saved */
  }
  const url = process.env.MEMBERS_SCRIPT_URL?.trim()
  const key = process.env.MEMBERS_SCRIPT_KEY?.trim()
  return url && key ? { url, key, savedAt: '' } : null
}

export const membersAvailable = () => isLocal()

export async function membersConnected(): Promise<boolean> {
  return !!(await conn())
}

const OK_URL = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/

async function fetchList(c: Pick<Conn, 'url' | 'key'>): Promise<{ fields: string[]; rows: unknown[][] }> {
  const r = await fetch(`${c.url}?key=${encodeURIComponent(c.key)}&action=list`, { cache: 'no-store', signal: AbortSignal.timeout(45_000) })
  const j = (await r.json().catch(() => null)) as { fields?: string[]; rows?: unknown[][]; error?: string } | null
  if (!j) throw new Error('The sheet did not answer properly.')
  if (j.error) throw new Error(j.error === 'Wrong app key.' ? 'The key is wrong.' : j.error)
  if (!Array.isArray(j.fields) || !Array.isArray(j.rows)) throw new Error('The sheet answered in a form this app does not know.')
  return { fields: j.fields, rows: j.rows }
}

export async function connectMembers(url: string, key: string): Promise<{ ok: boolean; msg: string }> {
  if (!isLocal()) return { ok: false, msg: 'This only works in the app on the director\'s computer.' }
  url = url.trim()
  key = key.trim()
  if (!OK_URL.test(url)) return { ok: false, msg: 'That is not a Google Apps Script link. It starts with https://script.google.com/macros/s/ and ends with /exec.' }
  if (!key) return { ok: false, msg: 'Enter the key.' }
  try {
    const d = await fetchList({ url, key })
    const { mkdir, writeFile } = await import('node:fs/promises')
    await mkdir('data', { recursive: true })
    await writeFile(FILE, seal({ url, key, savedAt: new Date().toISOString() }))
    cache = null
    return { ok: true, msg: `Connected. ${d.rows.length} members found.` }
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : 'Could not connect.' }
  }
}

export async function disconnectMembers(): Promise<void> {
  const { rm } = await import('node:fs/promises')
  await rm(FILE, { force: true })
  cache = null
}

let cache: { at: number; members: Member[] } | null = null

export async function loadMembers(fresh = false): Promise<{ members: Member[]; fetchedAt: string }> {
  if (!fresh && cache && Date.now() - cache.at < 60_000) return { members: cache.members, fetchedAt: new Date(cache.at).toISOString() }
  const c = await conn()
  if (!c) throw new Error('Not connected.')
  const { fields, rows } = await fetchList(c)
  const ix = (n: string) => fields.indexOf(n)
  const members: Member[] = rows.map((r) => ({
    nr: Number(r[ix('nr')]) || 0,
    name: String(r[ix('name')] ?? ''),
    occupation: String(r[ix('occupation')] ?? ''),
    date: String(r[ix('date')] ?? ''),
    q: r[ix('q')],
    cardPrinted: !!r[ix('cardPrinted')] && r[ix('cardPrinted')] !== 'no',
    hasPhoto: !!r[ix('hasPhoto')],
    banned: !!r[ix('banned')],
    duplicates: Array.isArray(r[ix('duplicates')]) ? (r[ix('duplicates')] as unknown[]).map(Number).filter(Boolean) : [],
  }))
  cache = { at: Date.now(), members }
  return { members, fetchedAt: new Date().toISOString() }
}

export interface MemberSummary { total: number; thisMonth: number; thisYear: number; cardsToPrint: number; noPhoto: number; banned: number; withDuplicates: number }
export function summarize(members: Member[]): MemberSummary {
  const now = new Date()
  const ym = now.toISOString().slice(0, 7)
  const y = now.toISOString().slice(0, 4)
  return {
    total: members.length,
    thisMonth: members.filter((m) => m.date.startsWith(ym)).length,
    thisYear: members.filter((m) => m.date.startsWith(y)).length,
    cardsToPrint: members.filter((m) => !m.cardPrinted && !m.banned).length,
    noPhoto: members.filter((m) => !m.hasPhoto).length,
    banned: members.filter((m) => m.banned).length,
    withDuplicates: members.filter((m) => m.duplicates.length > 0).length,
  }
}
