import { NextRequest, NextResponse } from 'next/server'
import { posterRead } from '@/lib/state-store'

/* A poster image. The name is made from the picture itself, so it can be kept by browsers and the CDN for good. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params
  const bytes = await posterRead(name)
  if (!bytes) return new NextResponse('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
  })
}
