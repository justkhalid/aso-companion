/* The inventory of the ASO space (server only, the director's computer only).
   Items live in the "Inventory" tab of the Google Sheet through its Apps Script link (bridge/Inventory.gs).
   Until a sheet is connected they are kept in a file on this computer (data/inventory.local.json) so the page works at once. */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { derivedKey } from './auth'
import { isLocal } from './mode'
import { itemCode } from './scan'

export const TYPES = ['book', 'equipment', 'furniture', 'game', 'other'] as const
export type ItemType = (typeof TYPES)[number]
export const STATUSES = ['available', 'lent', 'repair', 'missing'] as const
export type ItemStatus = (typeof STATUSES)[number]

export interface Item {
  code: string // the number on the label this app prints: 7 digits starting with 9
  barcode: string // the product barcode (ISBN for books), if it has one
  type: ItemType
  name: string
  by: string // author, or brand
  model: string
  serial: string
  category: string
  room: string
  shelf: string
  copies: number
  condition: string
  status: ItemStatus
  lentTo: string // member number
  lentAt: string
  year: string
  notes: string
  hasPhoto: boolean
  addedAt: string
  updatedAt: string
}

export const FIELDS: (keyof Item)[] = ['code', 'barcode', 'type', 'name', 'by', 'model', 'serial', 'category', 'room', 'shelf', 'copies', 'condition', 'status', 'lentTo', 'lentAt', 'year', 'notes', 'hasPhoto', 'addedAt', 'updatedAt']

const LOCAL_FILE = 'data/inventory.local.json'
const CONN_FILE = 'data/inventory.enc.json'
const PHOTO_DIR = 'data/inventory-photos'

interface Conn { url: string; key: string; savedAt: string }

function seal(c: Conn): string {
  const iv = randomBytes(12)
  const k = createCipheriv('aes-256-gcm', derivedKey('inventory'), iv)
  const data = Buffer.concat([k.update(JSON.stringify(c), 'utf8'), k.final()])
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: k.getAuthTag().toString('base64'), data: data.toString('base64') })
}
function unseal(text: string): Conn | null {
  try {
    const j = JSON.parse(text) as { iv: string; tag: string; data: string }
    const d = createDecipheriv('aes-256-gcm', derivedKey('inventory'), Buffer.from(j.iv, 'base64'))
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
    const c = unseal(await readFile(CONN_FILE, 'utf8'))
    if (c) return c
  } catch { /* none saved */ }
  const url = process.env.INVENTORY_SCRIPT_URL?.trim()
  const key = process.env.INVENTORY_SCRIPT_KEY?.trim()
  return url && key ? { url, key, savedAt: '' } : null
}

export const inventoryAvailable = () => isLocal()
export const inventoryConnected = async () => !!(await conn())

const OK_URL = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/

/* ---------- the sheet ---------- */

async function sheetGet<T>(c: Conn, params: Record<string, string>): Promise<T> {
  const q = new URLSearchParams({ key: c.key, ...params })
  const r = await fetch(`${c.url}?${q}`, { cache: 'no-store', signal: AbortSignal.timeout(45_000) })
  const j = (await r.json().catch(() => null)) as (T & { error?: string }) | null
  if (!j) throw new Error('The sheet did not answer properly.')
  if (j.error) throw new Error(j.error === 'Wrong app key.' ? 'The key is wrong.' : j.error)
  return j
}
async function sheetPost<T>(c: Conn, body: Record<string, unknown>): Promise<T> {
  const r = await fetch(c.url, { method: 'POST', body: JSON.stringify({ key: c.key, ...body }), cache: 'no-store', signal: AbortSignal.timeout(60_000) })
  const j = (await r.json().catch(() => null)) as (T & { error?: string }) | null
  if (!j) throw new Error('The sheet did not answer properly.')
  if (j.error) throw new Error(j.error)
  return j
}

export async function connectInventory(url: string, key: string): Promise<{ ok: boolean; msg: string }> {
  if (!isLocal()) return { ok: false, msg: 'This only works in the app on the director\'s computer.' }
  url = url.trim(); key = key.trim()
  if (!OK_URL.test(url)) return { ok: false, msg: 'That is not a Google Apps Script link. It starts with https://script.google.com/macros/s/ and ends with /exec.' }
  if (!key) return { ok: false, msg: 'Enter the key.' }
  try {
    const d = await sheetGet<{ rows: unknown[][] }>({ url, key, savedAt: '' }, { action: 'list' })
    const { mkdir, writeFile } = await import('node:fs/promises')
    await mkdir('data', { recursive: true })
    await writeFile(CONN_FILE, seal({ url, key, savedAt: new Date().toISOString() }))
    /* items kept on this computer before the sheet was connected go up to it */
    const local = await readLocal()
    let moved = 0
    if (local.length && !d.rows.length) {
      for (const it of local) { await sheetPost({ url, key, savedAt: '' }, { action: 'upsert', item: it }); moved++ }
    }
    return { ok: true, msg: `Connected. ${d.rows.length} items found${moved ? `, and ${moved} items from this computer were added to the sheet` : ''}.` }
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : 'Could not connect.' }
  }
}

export async function disconnectInventory(): Promise<void> {
  const { rm } = await import('node:fs/promises')
  await rm(CONN_FILE, { force: true })
}

/* ---------- the file on this computer ---------- */

async function readLocal(): Promise<Item[]> {
  try {
    const { readFile } = await import('node:fs/promises')
    const j = JSON.parse(await readFile(LOCAL_FILE, 'utf8')) as Item[]
    return Array.isArray(j) ? j : []
  } catch {
    return []
  }
}
async function writeLocal(items: Item[]): Promise<void> {
  const { mkdir, writeFile, rename } = await import('node:fs/promises')
  await mkdir('data', { recursive: true })
  await writeFile(LOCAL_FILE + '.tmp', JSON.stringify(items))
  await rename(LOCAL_FILE + '.tmp', LOCAL_FILE)
}

/* ---------- reading and writing items ---------- */

function clean(raw: Partial<Item>, old?: Item): Item {
  const now = new Date().toISOString()
  const s = (v: unknown) => String(v ?? '').trim().slice(0, 500)
  const type = (TYPES as readonly string[]).includes(String(raw.type)) ? (raw.type as ItemType) : old?.type || 'other'
  const status = (STATUSES as readonly string[]).includes(String(raw.status)) ? (raw.status as ItemStatus) : old?.status || 'available'
  return {
    code: s(raw.code || old?.code),
    barcode: s(raw.barcode ?? old?.barcode).replace(/\D/g, ''),
    type,
    name: s(raw.name ?? old?.name),
    by: s(raw.by ?? old?.by),
    model: s(raw.model ?? old?.model),
    serial: s(raw.serial ?? old?.serial),
    category: s(raw.category ?? old?.category),
    room: s(raw.room ?? old?.room),
    shelf: s(raw.shelf ?? old?.shelf),
    copies: Math.max(1, Math.min(9999, Math.round(Number(raw.copies ?? old?.copies ?? 1)) || 1)),
    condition: s(raw.condition ?? old?.condition),
    status,
    lentTo: status === 'lent' ? s(raw.lentTo ?? old?.lentTo) : '',
    lentAt: status === 'lent' ? s(raw.lentAt || old?.lentAt || now) : '',
    year: s(raw.year ?? old?.year),
    notes: s(raw.notes ?? old?.notes),
    hasPhoto: raw.hasPhoto ?? old?.hasPhoto ?? false,
    addedAt: old?.addedAt || now,
    updatedAt: now,
  }
}

let cache: { at: number; items: Item[] } | null = null

export async function loadItems(fresh = false): Promise<Item[]> {
  if (!fresh && cache && Date.now() - cache.at < 20_000) return cache.items
  const c = await conn()
  let items: Item[]
  if (c) {
    const d = await sheetGet<{ fields: string[]; rows: unknown[][] }>(c, { action: 'list' })
    items = d.rows.map((r) => {
      const o: Record<string, unknown> = Object.fromEntries(d.fields.map((f, i) => [f, r[i]]))
      o.hasPhoto = !!o.hasPhoto && o.hasPhoto !== 'no'
      return clean(o as Partial<Item>, undefined)
    }).map((it, i) => ({ ...it, addedAt: String(d.rows[i][d.fields.indexOf('addedAt')] || it.addedAt), updatedAt: String(d.rows[i][d.fields.indexOf('updatedAt')] || it.updatedAt) }))
  } else {
    items = await readLocal()
  }
  cache = { at: Date.now(), items }
  return items
}

export function nextCode(items: Item[]): string {
  let max = 0
  for (const i of items) if (/^9\d{6}$/.test(i.code)) max = Math.max(max, Number(i.code.slice(1)))
  return itemCode(max + 1)
}

export async function saveItem(raw: Partial<Item>, photoDataUrl?: string): Promise<Item> {
  const items = await loadItems(true)
  const old = items.find((i) => i.code === raw.code)
  const item = clean({ ...raw, code: raw.code || nextCode(items) }, old)
  if (!item.name) throw new Error('Give the item a name.')
  if (!/^9\d{6}$/.test(item.code)) throw new Error('The item number is not valid.')
  const c = await conn()
  if (photoDataUrl) {
    const m = photoDataUrl.match(/^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/)
    if (!m || m[1].length > 3_000_000) throw new Error('The photo is not valid or too big.')
    if (c) await sheetPost(c, { action: 'photo', code: item.code, dataUrl: photoDataUrl })
    else {
      const { mkdir, writeFile } = await import('node:fs/promises')
      await mkdir(PHOTO_DIR, { recursive: true })
      await writeFile(`${PHOTO_DIR}/${item.code}.jpg`, Buffer.from(m[1], 'base64'))
    }
    item.hasPhoto = true
  }
  if (c) await sheetPost(c, { action: 'upsert', item })
  else await writeLocal(old ? items.map((i) => (i.code === item.code ? item : i)) : [...items, item])
  cache = null
  return item
}

export async function deleteItem(code: string): Promise<void> {
  const c = await conn()
  if (c) await sheetPost(c, { action: 'delete', code })
  else {
    await writeLocal((await loadItems(true)).filter((i) => i.code !== code))
    const { rm } = await import('node:fs/promises')
    await rm(`${PHOTO_DIR}/${code}.jpg`, { force: true })
  }
  cache = null
}

/** the picture of one item: the file on this computer, or the sheet's Drive folder */
export async function loadPhoto(code: string): Promise<{ bytes: Buffer; type: string } | null> {
  if (!/^9\d{6}$/.test(code)) return null
  const c = await conn()
  if (c) {
    const d = await sheetGet<{ dataUrl?: string }>(c, { action: 'photo', code })
    const m = d.dataUrl?.match(/^data:(image\/[a-z]+);base64,(.+)$/)
    return m ? { bytes: Buffer.from(m[2], 'base64'), type: m[1] } : null
  }
  try {
    const { readFile } = await import('node:fs/promises')
    return { bytes: await readFile(`${PHOTO_DIR}/${code}.jpg`), type: 'image/jpeg' }
  } catch {
    return null
  }
}

/* ---------- finding a book by its ISBN ---------- */

export interface BookInfo { name: string; by: string; year: string; category: string; cover: string /* a data URL, or '' */ }

async function coverAsDataUrl(url: string): Promise<string> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!r.ok) return ''
    const type = r.headers.get('content-type') || ''
    if (!type.startsWith('image/')) return ''
    const b = Buffer.from(await r.arrayBuffer())
    if (b.length < 1500 || b.length > 2_000_000) return '' // a 1-pixel "no cover" picture, or too big
    return `data:${type.split(';')[0]};base64,${b.toString('base64')}`
  } catch {
    return ''
  }
}

export async function lookupIsbn(isbn: string): Promise<BookInfo | null> {
  if (!/^\d{13}$/.test(isbn)) return null
  try {
    const r = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`, { signal: AbortSignal.timeout(10_000) })
    const j = (await r.json()) as Record<string, { title?: string; subtitle?: string; authors?: { name: string }[]; publish_date?: string; subjects?: { name: string }[]; cover?: { medium?: string; large?: string } }>
    const b = j['ISBN:' + isbn]
    if (b?.title) {
      const cover = b.cover?.medium || b.cover?.large || `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`
      return {
        name: b.subtitle ? `${b.title}: ${b.subtitle}` : b.title,
        by: (b.authors || []).map((a) => a.name).join(', '),
        year: (b.publish_date || '').match(/\d{4}/)?.[0] || '',
        category: b.subjects?.[0]?.name || '',
        cover: await coverAsDataUrl(cover),
      }
    }
  } catch { /* try the next source */ }
  try {
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`, { signal: AbortSignal.timeout(10_000) })
    const j = (await r.json()) as { items?: { volumeInfo?: { title?: string; subtitle?: string; authors?: string[]; publishedDate?: string; categories?: string[]; imageLinks?: { thumbnail?: string } } }[] }
    const v = j.items?.[0]?.volumeInfo
    if (v?.title) {
      return {
        name: v.subtitle ? `${v.title}: ${v.subtitle}` : v.title,
        by: (v.authors || []).join(', '),
        year: (v.publishedDate || '').match(/\d{4}/)?.[0] || '',
        category: v.categories?.[0] || '',
        cover: v.imageLinks?.thumbnail ? await coverAsDataUrl(v.imageLinks.thumbnail.replace('http://', 'https://')) : '',
      }
    }
  } catch { /* not found */ }
  return null
}
