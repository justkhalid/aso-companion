/* Posting to the Facebook Page and the Instagram account through the Meta Graph API.
   Runs on the server only. The access token is kept encrypted on the server (Social kit > Connection) or, as a fallback, in Vercel variables;
   it never reaches the browser.

   Vercel variables (all optional once the app is connected from inside):
   META_APP_ID + META_APP_SECRET  lets the app turn a pasted token into a lasting one, read its expiry, and offer "Connect with Facebook"
   META_ACCESS_TOKEN, META_PAGE_ID, META_IG_USER_ID  a connection set up by hand (used when nothing is connected in the app)
   META_TOKEN_EXPIRES  YYYY-MM-DD for such a hand-made token (renewal reminder)
   META_GRAPH_VERSION  default v23.0
   META_GRAPH_BASE     default https://graph.facebook.com, only for testing against a stand-in server */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { derivedKey, hasStableSecret } from './auth'
import { secretRead, secretWrite } from './state-store'

export interface SocialConfig {
  token?: string
  page?: string
  ig?: string
  version: string
  base: string
  appId?: string
  appSecret?: string
  source: 'app' | 'env' | 'none'
  pageName?: string
  igName?: string
  savedAt?: string
  expiresAt?: string | null // null: does not expire; undefined: not known
}

interface Stored {
  token: string
  page: string
  ig?: string
  pageName?: string
  igName?: string
  savedAt: string
  expiresAt?: string | null
}

/* ---------------------------------------------------------------- the connection kept in the app, encrypted */

function seal(s: Stored): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', derivedKey('social'), iv)
  const data = Buffer.concat([c.update(JSON.stringify(s), 'utf8'), c.final()])
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') })
}

function unseal(text: string): Stored | null {
  try {
    const j = JSON.parse(text) as { v: number; iv: string; tag: string; data: string }
    const d = createDecipheriv('aes-256-gcm', derivedKey('social'), Buffer.from(j.iv, 'base64'))
    d.setAuthTag(Buffer.from(j.tag, 'base64'))
    return JSON.parse(Buffer.concat([d.update(Buffer.from(j.data, 'base64')), d.final()]).toString('utf8')) as Stored
  } catch {
    return null
  }
}

async function readStored(): Promise<Stored | null> {
  const t = await secretRead()
  return t ? unseal(t) : null
}

export async function disconnect(): Promise<{ ok: boolean; msg: string }> {
  return secretWrite('')
}

export async function socialConfig(): Promise<SocialConfig> {
  const e = process.env
  const common = {
    version: e.META_GRAPH_VERSION?.trim() || 'v23.0',
    base: (e.META_GRAPH_BASE?.trim() || 'https://graph.facebook.com').replace(/\/+$/, ''),
    appId: e.META_APP_ID?.trim() || undefined,
    appSecret: e.META_APP_SECRET?.trim() || undefined,
  }
  const st = await readStored()
  if (st) return { ...common, token: st.token, page: st.page, ig: st.ig, pageName: st.pageName, igName: st.igName, savedAt: st.savedAt, expiresAt: st.expiresAt, source: 'app' }
  const token = e.META_ACCESS_TOKEN?.trim() || undefined
  const page = e.META_PAGE_ID?.trim() || undefined
  if (token && page) {
    const exp = e.META_TOKEN_EXPIRES?.trim()
    return { ...common, token, page, ig: e.META_IG_USER_ID?.trim() || undefined, source: 'env', expiresAt: exp && !Number.isNaN(new Date(exp).getTime()) ? new Date(exp + (exp.length <= 10 ? 'T23:59:59Z' : '')).toISOString() : undefined }
  }
  return { ...common, source: 'none' }
}

const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)

export interface SocialStatus {
  connected: boolean
  source: 'app' | 'env' | 'none'
  pageName: string | null
  igName: string | null
  hasIg: boolean
  savedAt: string | null
  expiresAt: string | null
  noExpiry: boolean // known not to expire
  daysLeft: number | null
  canExchange: boolean // the app id and secret are set: a pasted token can be made lasting, and "Connect with Facebook" works
  canKeep: boolean // the server has a stable secret to encrypt the connection with
}

export async function socialStatus(): Promise<SocialStatus> {
  const c = await socialConfig()
  return {
    connected: !!(c.token && c.page),
    source: c.source,
    pageName: c.pageName || null,
    igName: c.igName || null,
    hasIg: !!c.ig,
    savedAt: c.savedAt || null,
    expiresAt: c.expiresAt || null,
    noExpiry: c.expiresAt === null,
    daysLeft: c.expiresAt ? daysUntil(c.expiresAt) : null,
    canExchange: !!(c.appId && c.appSecret),
    canKeep: hasStableSecret(),
  }
}

/* ---------------------------------------------------------------- talking to Meta */

class GraphError extends Error {
  code?: number
  sub?: number
}

type Data = Record<string, string | number | boolean>
type Cfg = Pick<SocialConfig, 'token' | 'version' | 'base'>

async function gp(c: Cfg, path: string, o: { method?: 'GET' | 'POST'; data?: Data; blob?: Blob | null; field?: string; token?: string } = {}): Promise<Record<string, unknown>> {
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

/* ---------------------------------------------------------------- connecting */

export interface ConnectResult {
  ok: boolean
  msg: string
  choose?: { id: string; name: string }[] // several Pages: the user picks one, then sends it again with pageId
}

type PageRow = { id: string; name?: string; access_token?: string; instagram_business_account?: { id: string; username?: string } }

/** turn a pasted (or just granted) token into a saved connection: lasting Page token, Page id, Instagram id */
export async function connectWithToken(raw: string, pageId?: string): Promise<ConnectResult> {
  const c = await socialConfig()
  if (!hasStableSecret()) return { ok: false, msg: 'The server has no fixed secret to keep the token safely. Ask whoever manages Vercel to set ASO_SESSION_SECRET.' }
  const tok0 = raw.trim()
  if (!tok0) return { ok: false, msg: 'Paste the token first.' }
  const canExchange = !!(c.appId && c.appSecret)
  const cfg: Cfg = { version: c.version, base: c.base }
  let tok = tok0
  let exchanged = false
  try {
    if (canExchange) {
      try {
        const ex = (await gp(cfg, 'oauth/access_token', { method: 'GET', data: { grant_type: 'fb_exchange_token', client_id: c.appId!, client_secret: c.appSecret!, fb_exchange_token: tok }, token: tok })) as { access_token?: string }
        if (ex.access_token) { tok = ex.access_token; exchanged = true }
      } catch {
        /* a Page token cannot be exchanged: use it as it is */
      }
    }
    let pages: PageRow[] = []
    try {
      pages = ((await gp(cfg, 'me/accounts', { method: 'GET', data: { fields: 'id,name,access_token,instagram_business_account{id,username}', limit: 50 }, token: tok })).data as PageRow[]) || []
    } catch {
      pages = []
    }
    let page: { id: string; name?: string; token: string; ig?: string; igName?: string }
    if (pages.length) {
      /* a user token: it must be made lasting, or the Page token it gives stops within hours */
      if (!exchanged) return { ok: false, msg: 'That is a personal token, which stops working within hours. Paste a Page token instead, or ask whoever manages Vercel to add META_APP_ID and META_APP_SECRET so the app can make it lasting.' }
      const pick = pageId ? pages.find((p) => p.id === pageId) : pages.length === 1 ? pages[0] : undefined
      if (!pick) {
        if (pageId) return { ok: false, msg: 'That Page is not on this account.' }
        return { ok: false, msg: 'This account manages several Pages. Choose the right one.', choose: pages.map((p) => ({ id: p.id, name: p.name || p.id })) }
      }
      if (!pick.access_token) return { ok: false, msg: 'Meta did not give a Page token. The token needs the pages_show_list and pages_manage_posts permissions.' }
      page = { id: pick.id, name: pick.name, token: pick.access_token, ig: pick.instagram_business_account?.id, igName: pick.instagram_business_account?.username }
    } else {
      /* a Page token */
      const me = (await gp(cfg, 'me', { method: 'GET', data: { fields: 'id,name' }, token: tok })) as { id: string; name?: string }
      const pg = (await gp(cfg, me.id, { method: 'GET', data: { fields: 'name,instagram_business_account{id,username}' }, token: tok })) as { name?: string; instagram_business_account?: { id: string; username?: string } }
      page = { id: me.id, name: pg.name || me.name, token: tok, ig: pg.instagram_business_account?.id, igName: pg.instagram_business_account?.username }
    }
    let expiresAt: string | null | undefined
    if (canExchange) {
      try {
        const d = (await gp(cfg, 'debug_token', { method: 'GET', data: { input_token: page.token }, token: `${c.appId}|${c.appSecret}` })).data as { expires_at?: number; is_valid?: boolean } | undefined
        if (d?.is_valid === false) return { ok: false, msg: 'Meta says that token is not valid.' }
        if (d) expiresAt = d.expires_at ? new Date(d.expires_at * 1000).toISOString() : null
      } catch {
        expiresAt = undefined
      }
    }
    const w = await secretWrite(seal({ token: page.token, page: page.id, ig: page.ig, pageName: page.name, igName: page.igName, savedAt: new Date().toISOString(), expiresAt }))
    if (!w.ok) return { ok: false, msg: 'Could not save the connection: ' + w.msg }
    return { ok: true, msg: page.ig ? `Connected to ${page.name || 'the Page'} and @${page.igName || 'Instagram'}.` : `Connected to ${page.name || 'the Page'}. No Instagram account is linked to it, so only Facebook can be used.` }
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : 'The connection failed.' }
  }
}

export async function oauthExchange(code: string, redirectUri: string): Promise<{ ok: boolean; token?: string; msg: string }> {
  const c = await socialConfig()
  if (!c.appId || !c.appSecret) return { ok: false, msg: 'META_APP_ID and META_APP_SECRET are not set on the server.' }
  try {
    const r = (await gp({ version: c.version, base: c.base }, 'oauth/access_token', { method: 'GET', data: { client_id: c.appId, client_secret: c.appSecret, redirect_uri: redirectUri, code }, token: `${c.appId}|${c.appSecret}` })) as { access_token?: string }
    return r.access_token ? { ok: true, token: r.access_token, msg: '' } : { ok: false, msg: 'Meta did not return a token.' }
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : 'failed' }
  }
}

export const OAUTH_SCOPES = 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish'

/* ---------------------------------------------------------------- test and publish */

export interface TestResult {
  ok: boolean
  lines: string[]
}

export async function testConnection(): Promise<TestResult> {
  const c = await socialConfig()
  const lines: string[] = []
  if (!c.token || !c.page) return { ok: false, lines: ['Not connected yet.'] }
  try {
    const pg = await gp(c, c.page, { method: 'GET', data: { fields: 'name' } })
    lines.push(`Facebook Page: ${pg.name}`)
    if (c.ig) {
      const ig = await gp(c, c.ig, { method: 'GET', data: { fields: 'username' } })
      lines.push(`Instagram: @${ig.username}`)
    } else lines.push('Instagram: no account is linked, so only Facebook can be used.')
    if (c.expiresAt === null) lines.push('The token does not expire.')
    else if (c.expiresAt) lines.push(`The token expires on ${c.expiresAt.slice(0, 10)} (${daysUntil(c.expiresAt)} days).`)
    lines.push('Connection works.')
    return { ok: true, lines }
  } catch (e) {
    lines.push('Failed: ' + (e instanceof Error ? e.message : 'unknown error'))
    lines.push('If the token ran out, reconnect under Social kit > Connection.')
    return { ok: false, lines }
  }
}

export interface PublishInput {
  targets: { igFeed: boolean; igStory: boolean; fbFeed: boolean; fbStory: boolean }
  caption: string
  story: Blob | null // 1080x1920
  poster: Blob | null // the feed picture
  poster45: Blob | null // 1080x1350, tried when Instagram refuses the feed picture's shape
}
export interface Step {
  label: string
  ok: boolean
  msg: string
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/* a picture put on the Page without publishing it: it gets a public address that Instagram can read */
async function hosted(c: SocialConfig, blob: Blob): Promise<{ id: string; url: string }> {
  const up = (await gp(c, `${c.page}/photos`, { data: { published: false }, blob })) as { id: string }
  const info = (await gp(c, up.id, { method: 'GET', data: { fields: 'images' } })) as { images?: { source: string }[] }
  const url = info.images?.[0]?.source
  if (!url) throw new Error('Facebook did not return an address for the picture')
  return { id: up.id, url }
}

async function igPublish(c: SocialConfig, imageUrl: string, extra: Data): Promise<string> {
  const cont = (await gp(c, `${c.ig}/media`, { data: { image_url: imageUrl, ...extra } })) as { id: string }
  for (let i = 0; i < 20; i++) {
    const s = (await gp(c, cont.id, { method: 'GET', data: { fields: 'status_code' } })) as { status_code?: string }
    if (s.status_code === 'FINISHED') break
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error('Instagram could not process the picture')
    await wait(1500)
  }
  const pub = (await gp(c, `${c.ig}/media_publish`, { data: { creation_id: cont.id } })) as { id: string }
  return pub.id
}

export async function publish(input: PublishInput): Promise<{ ok: boolean; steps: Step[] }> {
  const c = await socialConfig()
  const steps: Step[] = []
  const run = async (label: string, fn: () => Promise<string>) => {
    try {
      steps.push({ label, ok: true, msg: await fn() })
    } catch (e) {
      steps.push({ label, ok: false, msg: e instanceof Error ? e.message : 'failed' })
    }
  }
  if (!c.token || !c.page) return { ok: false, steps: [{ label: 'Connection', ok: false, msg: 'Not connected yet. Connect under Social kit > Connection.' }] }
  const t = input.targets
  if ((t.igFeed || t.igStory) && !c.ig) return { ok: false, steps: [{ label: 'Instagram', ok: false, msg: 'No Instagram account is linked to the Page.' }] }

  let storyHost: { id: string; url: string } | null = null
  const story = async () => {
    if (!input.story) throw new Error('The story picture is missing')
    return storyHost || (storyHost = await hosted(c, input.story))
  }

  if (t.igFeed) {
    await run('Instagram post', async () => {
      if (!input.poster) throw new Error('There is no picture for the post')
      try {
        await igPublish(c, (await hosted(c, input.poster)).url, { caption: input.caption })
        return 'Posted'
      } catch (e) {
        /* Instagram may refuse the shape of the picture: try again with the 4:5 version */
        if (!input.poster45 || !/aspect|ratio|dimension|size/i.test(e instanceof Error ? e.message : '')) throw e
        await igPublish(c, (await hosted(c, input.poster45)).url, { caption: input.caption })
        return 'Posted (4:5 version, Instagram refused the first shape)'
      }
    })
  }
  if (t.igStory) await run('Instagram story', async () => { await igPublish(c, (await story()).url, { media_type: 'STORIES' }); return 'Posted' })
  if (t.fbFeed) {
    await run('Facebook post', async () => {
      if (!input.poster) throw new Error('There is no picture for the post')
      await gp(c, `${c.page}/photos`, { data: { caption: input.caption, published: true }, blob: input.poster })
      return 'Posted'
    })
  }
  if (t.fbStory) await run('Facebook story', async () => { await gp(c, `${c.page}/photo_stories`, { data: { photo_id: (await story()).id } }); return 'Posted' })
  return { ok: steps.length > 0 && steps.every((s) => s.ok), steps }
}
