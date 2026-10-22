import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { inventoryAvailable, loadPhoto } from '@/lib/inventory'

/** GET /api/inventory/photo?code=9000001 -> the picture of one item. Admin only, on the director's computer only. */
export async function GET(req: NextRequest) {
  if (!isAdmin(req) || !inventoryAvailable()) return new NextResponse(null, { status: 404 })
  try {
    const p = await loadPhoto(new URL(req.url).searchParams.get('code') || '')
    if (!p) return new NextResponse(null, { status: 404 })
    return new NextResponse(new Uint8Array(p.bytes), { headers: { 'Content-Type': p.type, 'Cache-Control': 'private, max-age=300' } })
  } catch {
    return new NextResponse(null, { status: 502 })
  }
}
