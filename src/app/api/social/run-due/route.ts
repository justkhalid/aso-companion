import { NextRequest, NextResponse } from 'next/server'
import { runDue } from '@/lib/social-schedule'

export const maxDuration = 300

/**
 * GET or POST /api/social/run-due: posts whatever scheduled posts are due. A GitHub Actions workflow calls it every 10 minutes.
 * It only ever posts what an admin scheduled and only once the time has come, so it is safe to call often.
 * When the CRON_SECRET variable is set, the caller must send it as "Authorization: Bearer <secret>".
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 })
  return NextResponse.json({ ok: true, ...(await runDue()) }, { headers: { 'Cache-Control': 'no-store' } })
}
export const GET = handle
export const POST = handle
