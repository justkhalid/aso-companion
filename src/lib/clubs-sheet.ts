import { DAY_FULL } from './constants'
import type { Club, State } from './types'

/* "Clubs sheet": every club on its own A4 page, poster shown in full (never cropped),
   with the days, time and place underneath. Opens a clean print view; the browser's
   print dialog saves it as a PDF. */

const esc = (s: string) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

function whenOf(c: Club): string {
  const names = (c.days || []).map((d) => DAY_FULL[d] || d).join(' and ')
  const lead = !names ? '' : c.freq === 'biweekly' ? 'Every other ' + names : c.freq === 'monthly' ? 'Monthly on ' + names : 'Every ' + names
  return [lead, c.time].filter(Boolean).join(' · ')
}

export function openClubsSheet(state: State): boolean {
  const clubs = (state.clubs || []).filter((c) => !c.placeholder)
  const place = (c: Club) => [c.room, state.settings.institute].filter(Boolean).join(' · ')
  const pages = clubs
    .map(
      (c) => `<section class="page">
  <div class="poster">${
    c.poster
      ? `<img src="${esc(c.poster)}" alt="${esc(c.name)} poster">`
      : `<div class="noposter">${esc(c.name)}</div>`
  }</div>
  <div class="info">
    <h2>${esc(c.name)}</h2>
    <p class="when">${esc(whenOf(c) || 'Days and time to be confirmed')}</p>
    <p class="where">${esc(place(c))}</p>
  </div>
</section>`,
    )
    .join('\n')

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(state.settings.institute)} clubs</title>
<style>
  @page { size: A4; margin: 12mm }
  * { box-sizing: border-box }
  body { margin: 0; font-family: -apple-system, 'Segoe UI', Inter, Arial, sans-serif; color: #1c1c1e; background: #fff }
  .page { height: 273mm; display: flex; flex-direction: column; align-items: center; page-break-after: always; break-after: page }
  .page:last-child { page-break-after: auto; break-after: auto }
  .poster { flex: 1; min-height: 0; width: 100%; display: flex; align-items: center; justify-content: center }
  .poster img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 3mm; box-shadow: 0 0 0 .3mm #d8d8de }
  .noposter { width: 70%; aspect-ratio: 848/1200; max-height: 100%; display: flex; align-items: center; justify-content: center; text-align: center; padding: 12mm; border-radius: 3mm; background: #eef3fd; color: #0b5ce6; font-size: 11mm; font-weight: 800 }
  .info { padding-top: 6mm; text-align: center }
  h2 { margin: 0; font-size: 7mm; letter-spacing: -.01em }
  .when { margin: 2mm 0 0; font-size: 5mm; font-weight: 600; color: #0b5ce6 }
  .where { margin: 1mm 0 0; font-size: 4.2mm; color: #5c5c63 }
  .bar { position: sticky; top: 0; background: #0b5ce6; color: #fff; padding: 10px 16px; font-size: 14px; display: flex; gap: 12px; align-items: center }
  .bar button { margin-left: auto; border: 0; border-radius: 999px; padding: 8px 16px; font-weight: 700; cursor: pointer }
  @media screen { .page { margin: 16px auto; width: 186mm; height: auto; min-height: 260mm; padding: 8mm; box-shadow: 0 2px 14px rgba(0,0,0,.12); border-radius: 3mm; background: #fff } .poster img { max-height: 220mm } body { background: #f2f2f7 } }
  @media print { .bar { display: none } }
</style></head><body>
<div class="bar"><span>${clubs.length} clubs, one per page. Choose "Save as PDF" in the print window.</span><button onclick="window.print()">Print or save as PDF</button></div>
${pages || '<p style="padding:24px">No clubs yet.</p>'}
<script>window.addEventListener('load', function () { setTimeout(function () { window.print() }, 400) })</script>
</body></html>`

  const w = window.open('', '_blank')
  if (!w) return false
  w.document.open()
  w.document.write(html)
  w.document.close()
  return true
}
