/* a club or event story as a short looping video (MP4 where the browser can make one, else WebM) */
import { cv, makeStoryAnim, type KitParams, type KitTheme } from './engine'

export async function storyVideo(p: KitParams, t: KitTheme, o: { onProgress?: (p: number) => void } = {}): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  const anim = await makeStoryAnim(p, t)
  const types: [string, 'mp4' | 'webm'][] = [['video/mp4;codecs=avc1.640028', 'mp4'], ['video/mp4', 'mp4'], ['video/webm;codecs=vp9', 'webm'], ['video/webm', 'webm']]
  const pick = types.find(([m]) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m))
  if (!pick) throw new Error('This browser cannot record video. Use Chrome or Edge.')
  const c = cv(1080, 1920)
  const g = c.getContext('2d')!
  anim.draw(g, 0)
  const stream = c.captureStream(30)
  const rec = new MediaRecorder(stream, { mimeType: pick[0], videoBitsPerSecond: 8_000_000 })
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
  const done = new Promise<void>((res) => { rec.onstop = () => res() })
  /* warm-up: the picture already moves for a second before recording starts, so the video does not open on a frozen frame */
  const pre0 = performance.now()
  await new Promise<void>((res) => {
    const warm = () => {
      const w = (performance.now() - pre0) / 1000
      anim.draw(g, w % anim.loop)
      if (w >= 1) res()
      else requestAnimationFrame(warm)
    }
    warm()
  })
  rec.start(500)
  const t0 = performance.now()
  await new Promise<void>((res) => {
    const tick = () => {
      const s = (performance.now() - t0) / 1000
      anim.draw(g, (s + 1) % anim.loop)
      o.onProgress?.(Math.min(1, s / anim.loop))
      if (s >= anim.loop) res()
      else requestAnimationFrame(tick)
    }
    tick()
  })
  rec.stop()
  await done
  stream.getTracks().forEach((x) => x.stop())
  return { blob: new Blob(chunks, { type: pick[0].split(';')[0] }), ext: pick[1] }
}
