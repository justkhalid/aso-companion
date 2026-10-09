import { NextResponse } from 'next/server'

/**
 * GET /api/state
 * Server-side proxy that fetches the cloud state from raw.githubusercontent.com.
 * This eliminates the client-side CORS dependency and allows server-side caching.
 *
 * The GitHub repo is configured via the GITHUB_REPO environment variable
 * (default: justkhalid/aso-companion).
 */
export async function GET() {
  const repo = process.env.GITHUB_REPO || 'justkhalid/aso-companion'
  const branch = process.env.GITHUB_BRANCH || 'main'
  const path = process.env.GITHUB_STATE_PATH || 'data/state.json'

  const url = `https://raw.githubusercontent.com/${repo}/${branch}/${path}?t=${Date.now()}`

  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch state: HTTP ${res.status}` },
        { status: res.status }
      )
    }
    const data = await res.json()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
