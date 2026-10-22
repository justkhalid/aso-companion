/* Builds src/lib/icons-data.ts: every icon of the club and event picker (the old set plus a larger one) as plain SVG markup.
   The same list feeds the chips on the calendars and the pictures of the Social kit. Run once after changing the lists:
   node src/lib/kit/gen-icons.mjs   (needs lucide-react, react and react-dom installed) */
import fs from 'node:fs'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as L from 'lucide-react'

const src = fs.readFileSync('src/lib/icons.ts', 'utf8')
const body = src.slice(src.indexOf('export const CLUB_ICONS'))
const out = []
let group = 'Original'
for (const line of body.split('\n')) {
  const g = line.match(/^\s*\/\*\s*(.+?)\s*\*\/\s*$/)
  if (g) { group = g[1].replace(/\b\w/g, (c) => c.toUpperCase()); continue }
  const m = line.match(/\{ name: '([^']+)', label: '([^']+)', Icon: (\w+) \}/)
  if (m) out.push({ name: m[1], label: m[2], group, comp: m[3] })
}
const have = new Set(out.map((o) => o.name))
const EXTRA = {
  'School and study': 'graduation-cap backpack pencil pencil-ruler ruler eraser highlighter notebook notebook-pen notebook-text book-marked book-open-text book-open-check book-a book-copy book-heart book-user book-type library-big school scroll-text scan-text file-text clipboard-list clipboard-check clipboard-pen presentation lightbulb brain-circuit languages spell-check text-quote quote type pen-line pen-tool signature feather calculator abacus ruler-dimension-line sigma pi square-pi triangle-right compass university lectern',
  'Events and celebration': 'party-popper cake cake-slice gift gifts balloon ticket ticket-check tickets confetti award medal trophy crown star sparkles sparkle wand-sparkles megaphone mic-vocal speech podcast radio-tower projector theater popcorn clapperboard film camera aperture images image gallery-horizontal-end flag flag-triangle-right pennant handshake hand-heart heart-handshake smile laugh party-popper glass-water wine champagne-glass martini beer lamp-ceiling lamp-desk',
  'Sport and fitness': 'dumbbell footprints bike person-standing trophy volleyball goal medal timer stopwatch heart-pulse activity biceps-flexed swords target crosshair mountain mountain-snow tent tent-tree sailboat ship waves anchor fish drama kayak rowing-boat snowflake skiing hand-metal',
  'Art and music': 'palette brush paintbrush paintbrush-vertical pen-tool shapes scissors drafting-compass frame image-plus camera-off guitar drum piano music-2 music-3 music-4 mic-2 headphones headset speaker radio disc-3 disc-album audio-waveform audio-lines clapperboard video film tv-minimal theater drama puzzle sticker gem diamond stamp swatch-book spray-can brick-wall shirt hat-glasses glasses',
  'Technology and science': 'cpu microchip server database hard-drive laptop laptop-minimal monitor monitor-smartphone smartphone tablet keyboard mouse printer wifi bluetooth qr-code scan-line scan-face fingerprint shield-check shield lock key-round bug terminal code code-xml braces binary git-branch cloud cloud-sun globe network webhook bot cpu atom flask-conical flask-round test-tube test-tubes dna microscope telescope orbit rocket satellite-dish satellite radar magnet zap battery-charging plug lightbulb-off sun-medium moon-star planet telescope beaker pipette syringe stethoscope pill heart-pulse hospital',
  'Food and drink': 'utensils utensils-crossed chef-hat cooking-pot coffee cup-soda wine beer milk apple banana grape carrot cherry citrus croissant cookie ice-cream-cone ice-cream-bowl pizza sandwich soup salad drumstick fish beef egg-fried vegan wheat popcorn candy lollipop cake-slice sprout leafy-green amphora refrigerator microwave',
  'Nature and animals': 'leaf trees tree-pine tree-palm flower flower-2 sprout clover shrub cloud-rain cloud-sun sun moon snowflake wind rainbow umbrella mountain waves droplets bird bug cat dog rabbit squirrel turtle snail fish rat panda worm bee butterfly feather paw-print bone shell egg flame tornado thermometer-sun earth globe-lock tent-tree trees',
  'People and community': 'users user-round users-round user-check user-plus contact id-card baby accessibility person-standing hand-helping hand-heart heart-handshake handshake hand-coins heart smile-plus message-circle message-square messages-square message-circle-heart megaphone speech mails mail phone video share-2 link globe-2 map-pin house building building-2 landmark church hospital school store warehouse factory tent-tree flag-triangle-right scale scale-3d gavel vote badge-check award hand-metal hand peace',
  'Travel and places': 'plane plane-takeoff train-front bus car ship sailboat bike map map-pin map-pinned compass navigation route signpost luggage backpack tent tent-tree mountain mountain-snow landmark castle church tower-control hotel bed-double building-2 palmtree tree-palm sunrise sunset globe earth passport ticket tickets camera binoculars fuel',
  'Time and planning': 'calendar calendar-days calendar-clock calendar-check calendar-heart calendar-range calendar-plus clock clock-3 hourglass timer alarm-clock bell bell-ring list-checks list-todo clipboard-list kanban target flag notebook-pen sticky-note pin bookmark tag tags megaphone rss mail send inbox archive folder-open files file-check qr-code',
  'Money and work': 'banknote coins wallet piggy-bank hand-coins badge-dollar badge-percent receipt shopping-bag shopping-cart store briefcase briefcase-business building-2 chart-column chart-line chart-pie chart-bar trending-up presentation clipboard-check award handshake scale landmark gem crown',
  'Symbols and shapes': 'circle square triangle hexagon pentagon octagon diamond star heart infinity plus x check equal percent hash at-sign asterisk sparkles zap flame droplet sun moon cloud snowflake leaf shield sword key lock bell flag bookmark tag crown gem anchor feather infinity badge badge-check circle-dot orbit dices dice-1 dice-2 dice-3 dice-4 dice-5 dice-6 puzzle blocks'
}
const known = new Set(Object.keys(L).map((k) => k))
const kebab = (s) => s
const toPascal = (s) => s.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('')
const fixDigits = (s) => s
let added = 0
for (const [g, list] of Object.entries(EXTRA)) {
  for (const n of [...new Set(list.split(/\s+/).filter(Boolean))]) {
    if (have.has(n)) continue
    const comp = toPascal(n)
    if (!L[comp]) continue
    have.add(n); added++
    out.push({ name: n, label: n.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), group: g, comp })
  }
}
const rows = []
for (const o of out) {
  const C = L[o.comp]
  if (!C) { console.error('missing', o.comp); continue }
  const svg = renderToStaticMarkup(React.createElement(C))
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/<(\w+)([^>]*)><\/\1>/g, '<$1$2/>')
  rows.push([o.name, o.label, o.group, inner])
}
const ts = `/* Generated by src/lib/kit/gen-icons.mjs: name, label, group and the SVG markup (24 grid) of every picker icon. Do not edit by hand. */
export const ICON_DATA: [name: string, label: string, group: string, inner: string][] = ${JSON.stringify(rows, null, 1)}
`
fs.writeFileSync('src/lib/icons-data.ts', ts)
console.log('icons', rows.length, 'new', added)
