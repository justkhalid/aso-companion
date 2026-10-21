/* Posting to the Facebook Page and the Instagram account through the Meta Graph API.
   Runs on the server only: the access token comes from Vercel environment variables and never reaches the browser.
   META_ACCESS_TOKEN  a long-lived Page access token
   META_PAGE_ID       the Facebook Page id
   META_IG_USER_ID    the Instagram business account id linked to that Page
   META_GRAPH_VERSION (optional) default v23.0
   META_GRAPH_BASE    (optional) default https://graph.facebook.com, only for testing against a stand-in server
   META_APP_ID + META_APP_SECRET (optional) lets "Test connection" read the real token expiry
   META_TOKEN_EXPIRES (optional) YYYY-MM-DD, used for the renewal reminder when the app id and secret are not set */

export interface SocialConfig {
  token?: string
  page?: string
  ig?: string
  version: string
  base: string
  appId?: string
  appSecret?: string
  expires?: string
}

export function socialConfig(): SocialConfig {
  const e = process.env
  return {
    token: e.META_ACCESS_TOKEN?.trim() || undefined,
    page: e.META_PAGE_ID?.trim() || undefined,
    ig: e.META_IG_USER_ID?.trim() || undefined,
    version: e.META_GRAPH_VERSION?.trim() || 'v23.0',
    base: (e.META_GRAPH_BASE?.trim() || 'https://graph.facebook.com').replace(/\/+$/, ''),
    appId: e.META_APP_ID?.trim() || undefined,
    appSecret: e.META_APP_SECRET?.trim() || undefined,
    expires: e.META_TOKEN_EXPIRES?.trim() || undefined,
  }
}

export interface SocialStatus {
  token: boolean
  page: boolean
  ig: boolean
  expires: string | null // ISO date from META_TOKEN_EXPIRES
  daysLeft: number | null
}

const daysUntil = (iso: string) => Math.ceil((new Date(iso + (iso.length <= 10 ? 'T23:59:59Z' : '')).getTime() - Date.now()) / 86400000)

export function socialStatus(): SocialStatus {
  const c = socialConfig()
  const exp = c.expires && !Number.isNaN(new Date(c.expires).getTime()) ? c.expires : null
  return { token: !!c.token, page: !!c.page, ig: !!c.ig, expires: exp, daysLeft: exp ? daysUntil(exp) : null }
}

class GraphError extends Error {
  code?: number
  sub?: number
}

type Data = Record<string, string | number | boolean>

async function gp(path: string, o: { method?: 'GET' | 'POST'; data?: Data; blob?: Blob | null; field?: string; token?: string } = {}): Promise<Record<string, unknown>> {
  const c = socialConfig()
  const token = o.token || c.token
  if (!token) throw new Error('The access token is not set on the server')
  const url = `${c.base}/${c.version}/${path}`
  const method = o.method || 'POST'
  const data = o.data || {}
  let res: Response
  if (method === 'GET') {
    const q = new URLSearchParams(Object.entries(data).map(([k, v]) => [k, String(v)]))
    q.set('access_token', token)
    res = await fetch(`${url}?${q}`, { cache: 'no-store' })
  } else {
    const f = new FormData()
    for (const [k, v] of Object.entries(data)) f.append(k, String(v))
    if (o.blob) f.append(o.field || 'source', o.blob, 'image.jpg')
    f.append('access_token', token)
    res = await fetch(url, { method: 'POST', body: f })
  }
  const j = (await res.json().catch(() => ({}))) as { error?: { message?: string; error_user_msg?: string; code?: number; error_subcode?: number } } & Record<string, unknown>
  if (j.error) {
    const err = new GraphError(j.error.message + (j.error.error_user_msg ? ' - ' + j.error.error_user_msg : ''))
    err.code = j.error.code
    err.sub = j.error.error_subcode
    throw err
  }
  return j
}

export interface TestResult {
  ok: boolean
  lines: string[]
}

export async function testConnection(): Promise<TestResult> {
  const c = socialConfig()
  const lines: string[] = []
  if (!c.token || !c.page) return { ok: false, lines: ['META_ACCESS_TOKEN and META_PAGE_ID are not set on the server.'] }
  try {
    const pg = await gp(c.page, { method: 'GET', data: { fields: 'name' } })
    lines.push(`Facebook Page: ${pg.name}`)
    if (c.ig) {
      const ig = await gp(c.ig, { method: 'GET', data: { fields: 'username' } })
      lines.push(`Instagram: @${ig.username}`)
    } else lines.push('Instagram: META_IG_USER_ID is not set, so only Facebook can be used.')
    if (c.appId && c.appSecret) {
      const d = (await gp('debug_token', { method: 'GET', data: { input_token: c.token }, token: `${c.appId}|${c.appSecret}` })).data as { is_valid?: boolean; expires_at?: number; data_access_expires_at?: number } | undefined
      if (d) {
        if (d.is_valid === false) lines.push('The token is not valid any more. Make a new one.')
        else if (!d.expires_at) lines.push('The token does not expire.')
        else lines.push(`The token expires on ${new Date(d.expires_at * 1000).toISOString().slice(0, 10)} (${daysUntil(new Date(d.expires_at * 1000).toISOString())} days).`)
      }
    } else if (c.expires) lines.push(`The token is marked to expire on ${c.expires}.`)
    lines.push('Connection works.')
    return { ok: true, lines }
  } catch (e) {
    lines.push('Failed: ' + (e instanceof Error ? e.message : 'unknown error'))
    return { ok: false, lines }
  }
}

export interface PublishInput {
  targets: { igFeed: boolean; igStory: boolean; fbFeed: boolean; fbStory: boolean }
  caption: string
  story: Blob | null // 1080x1920
  poster: Blob | null // 1080x1440 (3:4)
  poster45: Blob | null // 1080x1350, tried when Instagram refuses the 3:4 picture
}
export interface Step {
  label: string
  ok: boolean
  msg: string
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/* a picture put on the Page without publishing it: it gets a public address that Instagram can read */
async function hosted(blob: Blob): Promise<{ id: string; url: string }> {
  const c = socialConfig()
  const up = (await gp(`${c.page}/photos`, { data: { published: false }, blob })) as { id: string }
  const info = (await gp(up.id, { method: 'GET', data: { fields: 'images' } })) as { images?: { source: string }[] }
  const url = info.images?.[0]?.source
  if (!url) throw new Error('Facebook did not return an address for the picture')
  return { id: up.id, url }
}

async function igPublish(imageUrl: string, extra: Data): Promise<string> {
  const c = socialConfig()
  const cont = (await gp(`${c.ig}/media`, { data: { image_url: imageUrl, ...extra } })) as { id: string }
  for (let i = 0; i < 20; i++) {
    const s = (await gp(cont.id, { method: 'GET', data: { fields: 'status_code' } })) as { status_code?: string }
    if (s.status_code === 'FINISHED') break
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error('Instagram could not process the picture')
    await wait(1500)
  }
  const pub = (await gp(`${c.ig}/media_publish`, { data: { creation_id: cont.id } })) as { id: string }
  return pub.id
}

export async function publish(input: PublishInput): Promise<{ ok: boolean; steps: Step[] }> {
  const c = socialConfig()
  const steps: Step[] = []
  const run = async (label: string, fn: () => Promise<string>) => {
    try {
      steps.push({ label, ok: true, msg: await fn() })
    } catch (e) {
      steps.push({ label, ok: false, msg: e instanceof Error ? e.message : 'failed' })
    }
  }
  if (!c.token || !c.page) return { ok: false, steps: [{ label: 'Connection', ok: false, msg: 'The access token and the Page id are not set on the server.' }] }
  const t = input.targets
  if ((t.igFeed || t.igStory) && !c.ig) return { ok: false, steps: [{ label: 'Instagram', ok: false, msg: 'META_IG_USER_ID is not set on the server.' }] }

  let storyHost: { id: string; url: string } | null = null
  const story = async () => {
    if (!input.story) throw new Error('The story picture is missing')
    return storyHost || (storyHost = await hosted(input.story))
  }

  if (t.igFeed) {
    await run('Instagram post', async () => {
      if (!input.poster) throw new Error('This one has no poster yet')
      try {
        await igPublish((await hosted(input.poster)).url, { caption: input.caption })
        return 'Posted'
      } catch (e) {
        /* Instagram may refuse the 3:4 shape: try again with the 4:5 version */
        if (!input.poster45 || !/aspect|ratio|dimension|size/i.test(e instanceof Error ? e.message : '')) throw e
        await igPublish((await hosted(input.poster45)).url, { caption: input.caption })
        return 'Posted (4:5 version, Instagram refused 3:4)'
      }
    })
  }
  if (t.igStory) await run('Instagram story', async () => { await igPublish((await story()).url, { media_type: 'STORIES' }); return 'Posted' })
  if (t.fbFeed) {
    await run('Facebook post', async () => {
      if (!input.poster) throw new Error('This one has no poster yet')
      await gp(`${c.page}/photos`, { data: { caption: input.caption, published: true }, blob: input.poster })
      return 'Posted'
    })
  }
  if (t.fbStory) await run('Facebook story', async () => { await gp(`${c.page}/photo_stories`, { data: { photo_id: (await story()).id } }); return 'Posted' })
  return { ok: steps.length > 0 && steps.every((s) => s.ok), steps }
}
