import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { posterWrite } from './state-store'

/* Server side, on every save: a poster that arrives as a picture inside the data becomes a small WebP file, and the data keeps its address.
   Nothing is lost if this fails: the picture simply stays where it is until the next save. */
type Item = { id?: string; poster?: string }

export interface Externalized {
  [key: string]: { url: string; len: number } // key: club:<id> or event:<id>; len: length of the picture it replaced
}

export async function externalizePosters(state: { clubs?: Item[]; events?: Item[] }): Promise<Externalized> {
  const out: Externalized = {}
  const lists: [string, Item[] | undefined][] = [['club', state.clubs], ['event', state.events]]
  for (const [kind, list] of lists) {
    for (const it of list || []) {
      const p = it.poster
      if (!p || !p.startsWith('data:image/') || !it.id) continue
      try {
        const raw = Buffer.from(p.slice(p.indexOf(',') + 1), 'base64')
        const webp = await sharp(raw).rotate().resize({ width: 848, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer()
        const name = createHash('sha1').update(webp).digest('hex').slice(0, 16) + '.webp'
        const w = await posterWrite(name, webp)
        if (!w.ok) continue
        const url = `/api/poster/${name}`
        out[`${kind}:${it.id}`] = { url, len: p.length }
        it.poster = url
      } catch {
        /* keep the picture inside the data */
      }
    }
  }
  return out
}
