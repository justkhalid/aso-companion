import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { posterWrite } from './state-store'

/* Server side, on every save: a poster that arrives as a picture inside the data becomes a small WebP file, and the data keeps its address.
   Nothing is lost if this fails: the picture simply stays where it is until the next save. */
type Item = { id?: string; poster?: string; kit?: { poster?: string } }

export interface Externalized {
  [key: string]: { url: string; len: number } // key: club:<id>, event:<id>, kit-club:<id> or kit-event:<id> (the framed poster of the Social kit); len: length of the picture it replaced
}

export async function externalizePosters(state: { clubs?: Item[]; events?: Item[] }): Promise<Externalized> {
  const out: Externalized = {}
  const lists: [string, Item[] | undefined][] = [['club', state.clubs], ['event', state.events]]
  for (const [kind, list] of lists) {
    for (const it of list || []) {
      if (!it.id) continue
      /* the website poster (3:4) and the framed poster of the Social kit (3:4, kept larger for posting) */
      const targets: [string, string | undefined, (url: string) => void, number, number, number][] = [
        [`${kind}:${it.id}`, it.poster, (u) => { it.poster = u }, 864, 1152, 78],
        [`kit-${kind}:${it.id}`, it.kit?.poster, (u) => { if (it.kit) it.kit.poster = u }, 1080, 1440, 85],
      ]
      for (const [key, p, setUrl, w, h, q] of targets) {
        if (!p || !p.startsWith('data:image/')) continue
        try {
          const raw = Buffer.from(p.slice(p.indexOf(',') + 1), 'base64')
          const webp = await sharp(raw).rotate().resize({ width: w, height: h, fit: 'inside', withoutEnlargement: true }).webp({ quality: q }).toBuffer()
          const name = createHash('sha1').update(webp).digest('hex').slice(0, 16) + '.webp'
          const wr = await posterWrite(name, webp)
          if (!wr.ok) continue
          const url = `/api/poster/${name}`
          out[key] = { url, len: p.length }
          setUrl(url)
        } catch {
          /* keep the picture inside the data */
        }
      }
    }
  }
  return out
}
