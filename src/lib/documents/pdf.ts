/* A one page A4 PDF around a JPEG, written by hand: no library, nothing to install. */
const SHORT = 595.28
const LONG = 841.89

const enc = new TextEncoder()

/** The PDF for one A4 page filled by the picture (it is already A4 shaped, so nothing is cropped). */
export function jpegToA4Pdf(jpeg: Uint8Array, pxW: number, pxH: number, landscape = false): Blob {
  const A4_W = landscape ? LONG : SHORT, A4_H = landscape ? SHORT : LONG
  const parts: Uint8Array[] = []
  const offsets: number[] = []
  let len = 0
  const push = (b: Uint8Array | string) => {
    const u = typeof b === 'string' ? enc.encode(b) : b
    parts.push(u)
    len += u.length
  }
  const obj = (n: number, body: string, stream?: Uint8Array) => {
    offsets[n] = len
    push(`${n} 0 obj\n${body}`)
    if (stream) {
      push('\nstream\n')
      push(stream)
      push('\nendstream')
    }
    push('\nendobj\n')
  }
  const content = enc.encode(`q ${A4_W} 0 0 ${A4_H} 0 0 cm /Im0 Do Q`)
  push('%PDF-1.4\n')
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W} ${A4_H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`)
  obj(4, `<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`, jpeg)
  obj(5, `<< /Length ${content.length} >>`, content)
  const xref = len
  let x = 'xref\n0 6\n0000000000 65535 f \n'
  for (let i = 1; i <= 5; i++) x += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  push(`${x}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}
