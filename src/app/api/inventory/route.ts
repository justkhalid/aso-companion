import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { connectInventory, deleteItem, disconnectInventory, inventoryAvailable, inventoryConnected, loadItems, lookupIsbn, nextCode, saveItem, type Item } from '@/lib/inventory'

export const maxDuration = 60
const no = () => NextResponse.json({ ok: false, msg: 'Sign in as admin' }, { status: 401 })
const headers = { 'Cache-Control': 'no-store' }

/**
 * GET /api/inventory            -> { available, connected, items, next }
 * GET /api/inventory?fresh=1    -> read again from the sheet
 * GET /api/inventory?isbn=...   -> the book's details from the online book databases
 * POST { action: 'save', item, photo? } | { action: 'delete', code } | { action: 'connect', url, key } | { action: 'disconnect' }
 * Admin only, and only in the app on the director's computer.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return no()
  if (!inventoryAvailable()) return NextResponse.json({ available: false, connected: false }, { headers })
  const q = new URL(req.url).searchParams
  try {
    if (q.get('isbn')) return NextResponse.json({ ok: true, book: await lookupIsbn(q.get('isbn') || '') }, { headers })
    const items = await loadItems(q.get('fresh') === '1')
    return NextResponse.json({ available: true, connected: await inventoryConnected(), items, next: nextCode(items) }, { headers })
  } catch (e) {
    return NextResponse.json({ available: true, connected: await inventoryConnected(), error: e instanceof Error ? e.message : 'failed' }, { headers })
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return no()
  if (!inventoryAvailable()) return NextResponse.json({ ok: false, msg: 'This only works in the app on the director\'s computer.' }, { headers })
  const b = (await req.json().catch(() => ({}))) as { action?: string; item?: Partial<Item>; photo?: string; code?: string; url?: string; key?: string }
  try {
    if (b.action === 'save') return NextResponse.json({ ok: true, item: await saveItem(b.item || {}, b.photo) }, { headers })
    if (b.action === 'delete') { await deleteItem(String(b.code || '')); return NextResponse.json({ ok: true }, { headers }) }
    if (b.action === 'connect') return NextResponse.json(await connectInventory(String(b.url || ''), String(b.key || '')), { headers })
    if (b.action === 'disconnect') { await disconnectInventory(); return NextResponse.json({ ok: true }, { headers }) }
    return NextResponse.json({ ok: false, msg: 'Unknown action' }, { status: 400, headers })
  } catch (e) {
    return NextResponse.json({ ok: false, msg: e instanceof Error ? e.message : 'failed' }, { headers })
  }
}
