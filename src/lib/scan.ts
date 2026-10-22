/* Barcode helpers shared by the inventory page: reading what a keyboard-style scanner types, checking it, and drawing Code 39 labels. */

/* A scanner that sends keys for a US keyboard looks like this on a French AZERTY keyboard: 1234567890 arrives as &é"'(-è_çà */
const AZERTY: Record<string, string> = { '&': '1', 'é': '2', '"': '3', "'": '4', '(': '5', '-': '6', 'è': '7', '_': '8', 'ç': '9', 'à': '0' }

/** what was typed or scanned, with French-keyboard characters turned back into digits when the result is all digits */
export function readScan(raw: string): string {
  const t = String(raw || '').trim().replace(/[\s*]/g, '')
  if (!t) return ''
  if (/^\d+$/.test(t)) return t
  const fixed = t.replace(/[&é"'(\-è_çà]/g, (c) => AZERTY[c])
  return /^\d+$/.test(fixed) ? fixed : t.toUpperCase()
}

/** EAN-13, EAN-8, UPC-A and ISBN-10 check digits */
export function checkDigitsOk(code: string): boolean {
  if (!/^\d+$/.test(code)) return false
  if (code.length === 13 || code.length === 12 || code.length === 8) {
    const d = code.split('').map(Number)
    const last = d.pop() as number
    let sum = 0
    for (let i = d.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += d[i] * w
    return (10 - (sum % 10)) % 10 === last
  }
  return false
}

export type ScanKind =
  | { kind: 'product'; code: string; isbn: boolean } // a product barcode (books: ISBN, 13 digits starting 978 or 979)
  | { kind: 'item'; code: string } // a label made by this app: 7 digits starting with 9
  | { kind: 'member'; code: string } // a membership card: up to 6 digits
  | { kind: 'bad'; code: string; why: string } // incomplete or wrong, scan again

export const ITEM_PREFIX = '9'
export const itemCode = (n: number) => ITEM_PREFIX + String(n).padStart(6, '0')

export function classifyScan(raw: string): ScanKind {
  const code = readScan(raw)
  if (!/^\d+$/.test(code)) return { kind: 'bad', code, why: 'That is not a number the scanner can read. Scan again.' }
  if (code.length === 7 && code.startsWith(ITEM_PREFIX)) return { kind: 'item', code }
  if (code.length <= 6) return { kind: 'member', code }
  if (code.length === 13 || code.length === 12 || code.length === 8) {
    if (!checkDigitsOk(code)) return { kind: 'bad', code, why: 'The code was read wrongly (its check digit does not match). Scan again.' }
    return { kind: 'product', code, isbn: code.length === 13 && (code.startsWith('978') || code.startsWith('979')) }
  }
  return { kind: 'bad', code, why: `Only ${code.length} digits were read. Scan again.` }
}

/* Code 39: each character is 9 elements (5 bars, 4 spaces), 3 of them wide. n = narrow, w = wide, bar first. */
const C39: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  '*': 'nwnnwnwnn',
}

/** a Code 39 barcode as an SVG string, digits only (the app's labels never carry letters or hyphens, which a French keyboard would garble) */
export function code39Svg(value: string, o: { height?: number; ratio?: number; color?: string } = {}): string {
  const ratio = o.ratio ?? 3
  const height = o.height ?? 60
  const color = o.color ?? '#000'
  const text = '*' + value.replace(/[^0-9]/g, '') + '*'
  let x = 0
  let bars = ''
  for (const ch of text) {
    const pat = C39[ch]
    if (!pat) continue
    for (let i = 0; i < 9; i++) {
      const w = pat[i] === 'w' ? ratio : 1
      if (i % 2 === 0) bars += `<rect x="${x}" y="0" width="${w}" height="${height}" fill="${color}"/>`
      x += w
    }
    x += 1 // the gap between characters
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} ${height}" preserveAspectRatio="none" role="img" aria-label="${value}">${bars}</svg>`
}
