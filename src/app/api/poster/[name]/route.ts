import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { posterRead } from '@/lib/state-store'

/* A poster image. The name is made from the picture itself, so it can be kept by browsers and the CDN for good.
   ?w=320 (or 480, 720) gives a smaller copy for cards and thumbnails. */
const WIDTHS = new Set([240, 320, 480, 720])
const small = new Map<string, Buffer>()

export async function GET(req: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params
  let bytes = await posterRead(name)
  if (!bytes) return new NextResponse('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })
  const w = Number(req.nextUrl.searchParams.get('w')) || 0
  if (WIDTHS.has(w)) {
    const key = `${name}@${w}`
    let s = small.get(key)
    if (!s) {
      s = await sharp(bytes).resize({ width: w, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer()
      if (small.size >= 48) small.delete(small.keys().next().value as string)
      small.set(key, s)
    }
    bytes = s
  }
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
  })
}
