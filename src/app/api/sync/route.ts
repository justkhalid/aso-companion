import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/sync
 * Server-side GitHub Contents API proxy for saving the state to the repo.
 * The PAT (Personal Access Token) is stored as a Vercel environment variable
 * (GITHUB_PAT) and NEVER exposed to the browser. The client sends the state
 * JSON; this route commits it to the repo.
 *
 * Request body: { content: string (JSON string of the state) }
 * Response: { ok: boolean, msg: string }
 */
export async function POST(req: NextRequest) {
  try {
    const token = process.env.GITHUB_PAT
    const repo = process.env.GITHUB_REPO || 'justkhalid/aso-companion'
    const branch = process.env.GITHUB_BRANCH || 'main'
    const path = process.env.GITHUB_STATE_PATH || 'data/state.json'

    if (!token) {
      return NextResponse.json(
        { ok: false, msg: 'GITHUB_PAT environment variable is not set. Add it in Vercel Settings -> Environment Variables.' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { content, message } = body as { content: string; message?: string }

    if (!content) {
      return NextResponse.json({ ok: false, msg: 'Missing content' }, { status: 400 })
    }

    const [owner, name] = repo.split('/')
    if (!owner || !name) {
      return NextResponse.json({ ok: false, msg: 'Invalid repo format (expected owner/name)' }, { status: 400 })
    }

    /* Step 1: get the current file SHA (if it exists) so PUT can update it */
    const metaUrl = `https://api.github.com/repos/${owner}/${name}/contents/${path}?ref=${encodeURIComponent(branch)}`
    const metaRes = await fetch(metaUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    let sha: string | undefined
    if (metaRes.ok) {
      const meta = await metaRes.json()
      sha = meta.sha
    }

    /* Step 2: encode the content and PUT it */
    const encoded = Buffer.from(content, 'utf-8').toString('base64')
    const putRes = await fetch(
      `https://api.github.com/repos/${owner}/${name}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message || `aso-companion: save state ${new Date().toISOString().slice(0, 19)}`,
          branch,
          content: encoded,
          ...(sha ? { sha } : {}),
        }),
      }
    )

    if (!putRes.ok) {
      const txt = await putRes.text()
      return NextResponse.json(
        { ok: false, msg: `GitHub API error: ${txt.slice(0, 200)}` },
        { status: putRes.status }
      )
    }

    return NextResponse.json({ ok: true, msg: 'Saved to GitHub' })
  } catch (e) {
    return NextResponse.json(
      { ok: false, msg: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
