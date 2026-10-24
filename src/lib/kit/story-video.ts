/* a club or event story as a short looping video (MP4 where the browser can make one, else WebM) */
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { cv, makeStoryAnim, type KitParams, type KitTheme } from './engine'

const FPS = 30
const SR = 48000

export interface Sound {
  file: Blob // the song the person chose (their own file)
  start: number // where in the song to begin, seconds
  volume: number // 0 to 1
}

/* the chosen song cut to the length of the story, faded in and out, as 48 kHz stereo */
async function renderSound(m: Sound, seconds: number): Promise<AudioBuffer> {
  const off = new OfflineAudioContext(2, Math.ceil(seconds * SR), SR)
  const buf = await off.decodeAudioData(await m.file.arrayBuffer())
  const src = off.createBufferSource()
  src.buffer = buf
  src.loop = true
  const gain = off.createGain()
  gain.gain.setValueAtTime(0, 0)
  gain.gain.linearRampToValueAtTime(m.volume, 0.4)
  gain.gain.setValueAtTime(m.volume, Math.max(0.4, seconds - 1))
  gain.gain.linearRampToValueAtTime(0, seconds)
  src.connect(gain)
  gain.connect(off.destination)
  src.start(0, m.start % Math.max(1, buf.duration))
  return off.startRendering()
}
const H264 = ['avc1.640029', 'avc1.640028', 'avc1.4D4029', 'avc1.42E029']

/* exact frames: every picture is drawn for its own timestamp and handed to the encoder, so a slow
   computer only takes longer to make the file. Recording the screen live turned every slow moment into a frozen stretch. */
async function encodeFrames(anim: Awaited<ReturnType<typeof makeStoryAnim>>, o: { onProgress?: (p: number) => void; forPost?: boolean; music?: Sound | null }): Promise<Blob | null> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return null
  const bitrate = o.forPost ? 1_500_000 : 8_000_000
  let codec = ''
  for (const c of H264) {
    try { if ((await VideoEncoder.isConfigSupported({ codec: c, width: 1080, height: 1920, bitrate, framerate: FPS })).supported) { codec = c; break } } catch { /* next */ }
  }
  if (!codec) return null
  if (o.music && (typeof AudioEncoder === 'undefined' || !(await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: SR, numberOfChannels: 2, bitrate: 128_000 })).supported)) {
    throw new Error('This browser cannot add sound to a video. Use the latest Chrome or Edge, or remove the song.')
  }
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: 1080, height: 1920 }, ...(o.music ? { audio: { codec: 'aac' as const, sampleRate: SR, numberOfChannels: 2 } } : null), fastStart: 'in-memory' })
  let failed: unknown = null
  const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { failed = e } })
  enc.configure({ codec, width: 1080, height: 1920, bitrate, framerate: FPS })
  const c = cv(1080, 1920), g = c.getContext('2d')!
  const n = Math.round(anim.loop * FPS)
  for (let i = 0; i < n; i++) {
    if (failed) throw failed
    anim.draw(g, i / FPS)
    const f = new VideoFrame(c, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) })
    enc.encode(f, { keyFrame: i % FPS === 0 })
    f.close()
    o.onProgress?.(i / n)
    while (enc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 4))
    if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0))
  }
  await enc.flush()
  if (failed) throw failed
  enc.close()
  if (o.music) {
    const pcm = await renderSound(o.music, anim.loop)
    const aenc = new AudioEncoder({ output: (chunk, meta) => muxer.addAudioChunk(chunk, meta), error: (e) => { failed = e } })
    aenc.configure({ codec: 'mp4a.40.2', sampleRate: SR, numberOfChannels: 2, bitrate: 128_000 })
    const L = pcm.getChannelData(0), R = pcm.getChannelData(pcm.numberOfChannels > 1 ? 1 : 0)
    const STEP = 4800
    for (let at = 0; at < pcm.length; at += STEP) {
      const len = Math.min(STEP, pcm.length - at)
      const data = new Float32Array(len * 2)
      data.set(L.subarray(at, at + len), 0)
      data.set(R.subarray(at, at + len), len)
      const ad = new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfFrames: len, numberOfChannels: 2, timestamp: Math.round((at * 1e6) / SR), data })
      aenc.encode(ad)
      ad.close()
    }
    await aenc.flush()
    aenc.close()
    if (failed) throw failed
  }
  muxer.finalize()
  return new Blob([muxer.target.buffer], { type: 'video/mp4' })
}

export async function storyVideo(p: KitParams, t: KitTheme, o: { onProgress?: (p: number) => void; forPost?: boolean; music?: Sound | null } = {}): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  const anim = await makeStoryAnim(p, t)
  try {
    const exact = await encodeFrames(anim, o)
    if (exact) return { blob: exact, ext: 'mp4' }
  } catch (e) {
    if (o.music) throw e instanceof Error ? e : new Error('The song could not be added to the video.')
    /* fall back to recording live */
  }
  const types: [string, 'mp4' | 'webm'][] = [['video/mp4;codecs=avc1.640028', 'mp4'], ['video/mp4', 'mp4'], ['video/webm;codecs=vp9', 'webm'], ['video/webm', 'webm']]
  const pick = types.find(([m]) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m))
  if (!pick) throw new Error('This browser cannot record video. Use Chrome or Edge.')
  const c = cv(1080, 1920)
  const g = c.getContext('2d')!
  anim.draw(g, 0)
  const stream = c.captureStream(30)
  const rec = new MediaRecorder(stream, { mimeType: pick[0], videoBitsPerSecond: o.forPost ? 1_500_000 : 8_000_000 })
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
