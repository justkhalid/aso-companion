/* Edge decorations and looks of the club kit, ported unchanged from the generator.
   Each decoration returns SVG body markup for a 1080x1920 canvas. */
export type RGB = [number, number, number]
export type Look = [label: string, c1: RGB, c2: RGB, ink: RGB, decor: string, icon: string]

export const rg = (c: number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const PEARL: RGB = [244, 240, 232];
export const DECOR: Record<string, (c1: RGB, c2: RGB) => string> = {
  none: () => "",
  film: (c1, c2) => {
    let b = "";
    for (const x0 of [0, 1028]) {
      b += `<rect x="${x0}" y="0" width="52" height="1920" fill="${rg(c1, .93)}"/>`;
      for (let y = 18; y < 1920; y += 64) b += `<rect x="${x0 + 14}" y="${y}" width="24" height="34" rx="6" fill="${rg(PEARL)}"/>`;
    }
    return b + `<rect x="52" y="0" width="3" height="1920" fill="${rg(c2, .9)}"/><rect x="1025" y="0" width="3" height="1920" fill="${rg(c2, .9)}"/>`;
  },
  rings: (c1, c2) => {
    let b = "";
    for (const [cx, cy] of [[0, 1920], [1080, 1920]]) {
      let i = 0;
      for (let r = 150; r < 480; r += 48, i++) b += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${rg(i % 2 ? c2 : c1, .75 - .08 * i)}" stroke-width="8"/>`;
    }
    return b;
  },
  atoms: (c1, c2) => {
    let b = "";
    const atom = (cx: number, cy: number) => {
      let s = "";
      for (const ang of [0, 60, 120]) {
        s += `<ellipse cx="${cx}" cy="${cy}" rx="250" ry="86" transform="rotate(${ang} ${cx} ${cy})" fill="none" stroke="${rg(c1, .6)}" stroke-width="5"/>`;
        const ex = 250 * Math.cos(35 * Math.PI / 180), ey = 86 * Math.sin(35 * Math.PI / 180), a = ang * Math.PI / 180;
        s += `<circle cx="${(cx + ex * Math.cos(a) - ey * Math.sin(a)).toFixed(1)}" cy="${(cy + ex * Math.sin(a) + ey * Math.cos(a)).toFixed(1)}" r="13" fill="${rg(c2, .95)}"/>`;
      }
      return s + `<circle cx="${cx}" cy="${cy}" r="20" fill="${rg(c2, .95)}"/>`;
    };
    b += atom(30, 1900) + atom(1050, 1900);
    for (const [x, y, r] of [[70, 470, 20], [1010, 430, 16], [130, 760, 14], [960, 700, 22], [60, 980, 12], [1020, 1000, 14]])
      b += `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z" fill="${rg(c2, .8)}"/>`;
    return b;
  },
  stripes: (c1, c2) => {
    let b = "";
    for (const [sx, sy, fl] of [[1080, 0, 1], [0, 1920, -1]])
      for (const [s, w, col] of ([[180, 30, c1], [138, 12, c2], [104, 22, c1], [66, 9, c2]] as [number, number, RGB][]))
        b += `<line x1="${sx - fl * s}" y1="${sy}" x2="${sx}" y2="${sy + fl * s}" stroke="${rg(col, .92)}" stroke-width="${w}"/>`;
    return b;
  },
  triangles: (c1, c2) => {
    let b = "";
    for (const [y0, d] of [[0, 1], [1920, -1]]) {
      let i = 0;
      for (let x = -23; x < 1103; x += 46, i++) b += `<polygon points="${x},${y0} ${x + 46},${y0} ${x + 23},${y0 + d * 46}" fill="${rg(i % 2 ? c2 : c1, .95)}"/>`;
      for (let x = 0; x < 1100; x += 46) b += `<rect x="${x + 16}" y="${y0 + d * 62 - 6}" width="12" height="12" transform="rotate(45 ${x + 22} ${y0 + d * 62})" fill="${rg(c1, .9)}"/>`;
    }
    return b;
  },
  brain: (c1, c2) => {
    const L = '<path d="M12 4a3 3 0 0 0-5 2 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 5 2z"/>', R = '<path d="M12 4a3 3 0 0 1 5 2 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-5 2z"/>';
    const fold = '<path d="M9 8.5c1 .6 1.8.6 3 0M8 13c1.2-.6 2.4-.6 4 0M15 8.5c-1 .6-1.8.6-3 0M16 13c-1.2-.6-2.4-.6-4 0"/>';
    let b = `<g transform="translate(6 1230) scale(7.9)" fill="none" stroke="${rg(c1, .55)}" stroke-width="0.42" stroke-linecap="round" stroke-linejoin="round">${L}${R}${fold}</g>`;
    b += `<g transform="translate(886 1230) scale(7.9)" fill="none" stroke="${rg(c2, .65)}" stroke-width="0.42" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17.5c-2-1.4-3.4-3.6-3.4-6.2a6.4 6.4 0 0 1 12.8 0c0 2.6-1.4 4.8-3.4 6.2z"/><path d="M9.6 20h4.8M10.6 22.4h2.8"/><path d="M12 2V.4M4.6 4.2L3.4 3M19.4 4.2L20.6 3M2 11.4H.4M22 11.4h1.6"/></g>`;
    for (const [x, y, r] of [[96, 1196, 8], [74, 1160, 12], [96, 1114, 17]]) b += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${rg(c1, .5)}" stroke-width="3"/>`;
    for (const [x, y, r] of [[984, 1196, 8], [1006, 1160, 12], [984, 1114, 17]]) b += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${rg(c2, .55)}" stroke-width="3"/>`;
    return b;
  },
  books: (c1, c2) => {
    const G = (path: string, tx: number, ty: number, sc: number, col: RGB, a: number, sw = .45) => `<g transform="translate(${tx} ${ty}) scale(${sc})" fill="none" stroke="${rg(col, a)}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${path}</g>`;
    const book = '<path d="M12 6c-2-1.4-5-1.8-8-1.4v13c3-.4 6 0 8 1.4 2-1.4 5-1.8 8-1.4v-13c-3-.4-6 0-8 1.4z"/><path d="M12 6v13"/><path d="M5.5 8.2c1.8-.2 3.6 0 5 .8M5.5 11.2c1.8-.2 3.6 0 5 .8M13.5 9c1.4-.8 3.2-1 5-.8M13.5 12c1.4-.8 3.2-1 5-.8"/>';
    let b = G(book, 12, 1330, 7.2, c1, .6, .5) + G(book, 898, 1330, 7.2, c2, .65, .5);
    for (const [x, y, r] of [[80, 470, 10], [1000, 440, 8], [950, 760, 12], [110, 840, 8]])
      b += `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z" fill="${rg(c2, .7)}"/>`;
    return b;
  },
  leaves: (c1, c2) => {
    const leaf = (cx: number, cy: number, s: number, ang: number, col: RGB, a: number) => `<g transform="rotate(${ang} ${cx} ${cy})"><path d="M${cx} ${cy - s} C${cx + s * .8} ${cy - s * .4} ${cx + s * .7} ${cy + s * .5} ${cx} ${cy + s} C${cx - s * .7} ${cy + s * .5} ${cx - s * .8} ${cy - s * .4} ${cx} ${cy - s}Z" fill="${rg(col, a)}"/><line x1="${cx}" y1="${cy - s * .8}" x2="${cx}" y2="${cy + s}" stroke="rgba(255,255,255,0.55)" stroke-width="3"/></g>`;
    let b = "";
    for (const [bx, by, sg] of [[0, 1500, 1], [1080, 1500, -1]]) {
      b += `<path d="M${bx} ${by + 260} C${bx + sg * 110} ${by + 150} ${bx + sg * 40} ${by + 40} ${bx + sg * 150} ${by - 120}" fill="none" stroke="${rg(c1, .7)}" stroke-width="6"/>`;
      for (let k = 0; k < 7; k++) {
        const t = k / 6, x = bx + sg * (40 + 110 * t * (k % 2 ? 1 : .6)), y = by + 230 - 340 * t;
        b += leaf(x + sg * (k % 2 ? 26 : -4), y, 38 - 3 * k, sg * (k % 2 ? 40 : -50), k % 2 ? c1 : c2, .85);
      }
    }
    for (const [x, y, s, a, col] of ([[80, 150, 30, 40, c2], [1000, 130, 34, -40, c1], [150, 230, 22, 20, c1], [940, 240, 24, -20, c2]] as [number, number, number, number, RGB][])) b += leaf(x, y, s, a, col, .85);
    return b;
  },
  dots: (c1, c2) => {
    let b = "";
    for (const [bx, by, sg] of [[0, 0, 1], [1080, 1920, -1]]) for (let r = 0; r < 7; r++) for (let k = 0; k < 7 - r; k++) b += `<circle cx="${bx + sg * (50 + k * 52)}" cy="${by + sg * (50 + r * 52)}" r="${14 - r * 1.3}" fill="${rg((r + k) % 2 ? c1 : c2, .8)}"/>`;
    return b;
  },
  waves: (c1, c2) => {
    let b = "";
    for (let i = 0; i < 5; i++) {
      const y = 1620 + i * 46, a = 28 - i * 3;
      b += `<path d="M0 ${y} Q135 ${y - a} 270 ${y} T540 ${y} T810 ${y} T1080 ${y} V1920 H0Z" fill="${rg(i % 2 ? c2 : c1, .16 + i * .05)}"/>`;
      b += `<path d="M0 ${150 - i * 26} Q135 ${130 - i * 26 - a} 270 ${150 - i * 26} T540 ${150 - i * 26} T810 ${150 - i * 26} T1080 ${150 - i * 26}" fill="none" stroke="${rg(i % 2 ? c1 : c2, .5)}" stroke-width="5"/>`;
    }
    return b;
  },
  stars: (c1, c2) => {
    const star = (cx: number, cy: number, r: number, col: RGB, a: number) => { let d = ""; for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * .45 : r, an = -Math.PI / 2 + i * Math.PI / 5; d += (i ? "L" : "M") + (cx + rr * Math.cos(an)).toFixed(1) + " " + (cy + rr * Math.sin(an)).toFixed(1); } return `<path d="${d}Z" fill="${rg(col, a)}"/>`; };
    let b = "";
    for (const [x, y, r, k] of [[90, 120, 46, 0], [980, 190, 30, 1], [170, 250, 22, 1], [930, 90, 20, 0], [60, 1780, 40, 1], [990, 1700, 52, 0], [160, 1650, 24, 0], [920, 1830, 26, 1], [1010, 1500, 18, 1], [70, 1560, 18, 0]] as number[][]) b += star(x, y, r, k ? c2 : c1, .85);
    return b;
  },
  confetti: (c1, c2) => {
    let b = "", n = 1;
    const rnd = () => { n = (n * 16807) % 2147483647; return n / 2147483647; };
    for (let i = 0; i < 46; i++) {
      const top = i % 2 === 0, x = rnd() * 1080, y = top ? rnd() * 260 : 1640 + rnd() * 270, an = rnd() * 180;
      b += i % 3 ? `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${12 + rnd() * 14}" height="${6 + rnd() * 6}" rx="2" transform="rotate(${an.toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})" fill="${rg(i % 2 ? c1 : c2, .8)}"/>` : `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${6 + rnd() * 6}" fill="${rg(i % 2 ? c2 : c1, .8)}"/>`;
    }
    return b;
  },
  diamonds: (c1, c2) => {
    let b = "";
    for (let i = 0; i < 9; i++) for (const [y0, dir] of [[40, 1], [1880, -1]]) {
      const x = 60 + i * 120, y = y0 + dir * ((i % 2) * 34), s = 36;
      b += `<path d="M${x} ${y - s} L${x + s} ${y} L${x} ${y + s} L${x - s} ${y}Z" fill="${rg(i % 2 ? c1 : c2, .75)}"/>`;
    }
    return b;
  },

  /* ---- added: six more edges, same drawing rules as the ones above ---- */
  hexagons: (c1, c2) => {
    let b = "";
    const hex = (cx: number, cy: number, r: number, col: RGB, a: number) => {
      let d = "";
      for (let i = 0; i < 6; i++) {
        const an = (Math.PI / 3) * i + Math.PI / 6;
        d += (i ? "L" : "M") + (cx + r * Math.cos(an)).toFixed(1) + " " + (cy + r * Math.sin(an)).toFixed(1);
      }
      return `<path d="${d}Z" fill="none" stroke="${rg(col, a)}" stroke-width="6"/>`;
    };
    for (let i = 0; i < 9; i++) {
      const x = 60 + i * 120, y = 92 + (i % 2) * 50, r = 34 - (i % 3) * 5;
      b += hex(x, y, r, i % 2 ? c1 : c2, .7);
      b += hex(x, 1828 - (i % 2) * 50, r, i % 2 ? c2 : c1, .7);
    }
    return b;
  },
  chevrons: (c1, c2) => {
    let b = "";
    for (let i = 0; i < 4; i++) {
      const a = .55 - i * .09, y = 120 + i * 52, y2 = 1800 - i * 52;
      b += `<path d="M0 ${y} L135 ${y + 58} L270 ${y}" fill="none" stroke="${rg(i % 2 ? c2 : c1, a)}" stroke-width="10"/>`;
      b += `<path d="M810 ${y2} L945 ${y2 - 58} L1080 ${y2}" fill="none" stroke="${rg(i % 2 ? c1 : c2, a)}" stroke-width="10"/>`;
    }
    return b;
  },
  petals: (c1, c2) => {
    let b = "";
    const flower = (cx: number, cy: number, r: number, n: number, col: RGB, a: number) => {
      let s = "";
      for (let i = 0; i < n; i++) {
        const an = (360 / n) * i;
        s += `<ellipse cx="${cx}" cy="${cy - r * 0.55}" rx="${(r * 0.3).toFixed(1)}" ry="${(r * 0.62).toFixed(1)}" transform="rotate(${an} ${cx} ${cy})" fill="${rg(col, a)}"/>`;
      }
      return s;
    };
    b += flower(92, 150, 64, 7, c2, .5) + flower(988, 1776, 80, 7, c1, .45);
    b += flower(1002, 208, 34, 6, c1, .38) + flower(72, 1706, 40, 6, c2, .38);
    return b;
  },
  arcs: (c1, c2) => {
    let b = "";
    for (const [cx, cy] of [[0, 0], [1080, 1920]]) {
      for (let i = 0; i < 5; i++) {
        const r = 190 + i * 78;
        b += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${rg(i % 2 ? c2 : c1, .5 - i * .07)}" stroke-width="${9 - i}"/>`;
      }
    }
    return b;
  },
  grid: (c1, c2) => {
    let b = "";
    for (let x = 40; x < 1080; x += 62) {
      b += `<rect x="${x}" y="0" width="2" height="230" fill="${rg(c1, .35)}"/>`;
      b += `<rect x="${x}" y="1690" width="2" height="230" fill="${rg(c2, .35)}"/>`;
    }
    for (let y = 40; y < 230; y += 62) {
      b += `<rect x="0" y="${y}" width="1080" height="2" fill="${rg(c1, .2)}"/>`;
      b += `<rect x="0" y="${1690 + y}" width="1080" height="2" fill="${rg(c2, .2)}"/>`;
    }
    return b;
  },
  bubbles: (c1, c2) => {
    let b = "", n = 7;
    const rnd = () => { n = (n * 16807) % 2147483647; return n / 2147483647; };
    for (let i = 0; i < 18; i++) {
      const r = 12 + rnd() * 46, x = rnd() * 1080, y = 1920 - rnd() * 430;
      b += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(0)}" fill="none" stroke="${rg(i % 2 ? c1 : c2, .35 + rnd() * .35)}" stroke-width="4"/>`;
    }
    return b;
  }
};
export const DECOR_NAMES: Record<string, string> = { none: "None", film: "Film strips", rings: "Sound rings", atoms: "Atoms and sparkles", stripes: "Corner stripes", triangles: "Triangle pattern", brain: "Brain and bulb", books: "Open books", leaves: "Leaves", dots: "Dot corners", waves: "Soft waves", stars: "Stars", confetti: "Confetti", diamonds: "Diamond rows", hexagons: "Honeycomb", chevrons: "Chevrons", petals: "Petals", arcs: "Arc rings", grid: "Fine grid", bubbles: "Bubbles" };
// Looks used by the existing clubs: [label, c1, c2, ink, decor, icon]
export const LOOKS: Record<string, Look> = {
  movie: ["Movie night: burgundy and gold, film strips", [96, 18, 40], [222, 158, 38], [58, 14, 28], "film", "i-movie"],
  speaking: ["Public speaking: navy and coral, sound rings", [18, 52, 138], [240, 90, 70], [14, 26, 74], "rings", "i-speaking"],
  philo: ["Philo Physics: indigo and teal, atoms", [46, 34, 128], [20, 150, 170], [28, 24, 86], "atoms", "i-philo"],
  sports: ["Sports: green and orange, stripes", [14, 104, 76], [238, 120, 32], [10, 60, 46], "stripes", "i-sports"],
  africa: ["Discover Africa: rust and gold, triangles", [150, 46, 22], [228, 160, 36], [84, 30, 16], "triangles", "i-africa"],
  psychology: ["Psychology: purple and magenta, brain and bulb", [76, 34, 130], [196, 48, 122], [50, 22, 90], "brain", "i-psy"],
  reading: ["English Reading: green and gold, books", [20, 84, 62], [196, 140, 54], [14, 52, 40], "books", "i-reading"],
  eco: ["Eco: green and lime, leaves", [24, 120, 56], [140, 180, 40], [14, 70, 36], "leaves", "environment"],
  ocean: ["Ocean: deep blue and cyan", [10, 50, 120], [0, 170, 200], [8, 30, 80], "rings", "science"],
  sunset: ["Sunset: orange and pink", [210, 80, 30], [220, 60, 120], [110, 40, 30], "triangles", "art"],
  royal: ["Royal: purple and gold", [70, 30, 120], [214, 170, 60], [40, 20, 80], "atoms", "music"],
  crimson: ["Crimson and navy", [150, 20, 40], [20, 40, 110], [70, 14, 28], "stripes", "debate"],
  mint: ["Mint and navy", [20, 140, 120], [20, 50, 120], [10, 60, 60], "books", "coding"],
  slate: ["Slate and amber", [50, 60, 80], [230, 150, 40], [30, 36, 50], "triangles", "chess"],
  aso: ["ASO classic: navy and red, rings", [14, 26, 74], [214, 34, 43], [14, 26, 74], "rings", "ai"],
  teal: ["Teal and blue: atoms", [8, 96, 112], [60, 90, 200], [6, 54, 70], "atoms", "ai"],
  gold: ["Navy and gold: books", [18, 40, 110], [200, 150, 40], [12, 26, 74], "books", "ai"],
  rose: ["Rose and plum: soft waves", [170, 40, 96], [100, 30, 120], [80, 20, 60], "waves", "art"],
  forest: ["Forest and sand: leaves", [20, 70, 50], [210, 170, 100], [12, 44, 32], "leaves", "environment"],
  citrus: ["Citrus: orange and teal, confetti", [236, 120, 20], [10, 140, 150], [110, 50, 10], "confetti", "i-sports"],
  midnight: ["Midnight and silver: stars", [20, 24, 64], [150, 170, 210], [255, 255, 255], "stars", "science"],
  coral: ["Coral and navy: dots", [240, 100, 90], [20, 50, 110], [120, 30, 30], "dots", "music"],
  lavender: ["Lavender and mint: diamonds", [120, 90, 190], [60, 180, 150], [60, 40, 110], "diamonds", "art"],
  graphite: ["Graphite and lime: stripes", [40, 44, 52], [150, 200, 30], [255, 255, 255], "stripes", "coding"],
  ruby: ["Ruby and gold: diamonds", [140, 10, 50], [230, 180, 60], [255, 255, 255], "diamonds", "debate"],
  azure: ["Azure and white: soft waves", [20, 100, 200], [120, 200, 240], [10, 50, 120], "waves", "science"],
  olive: ["Olive and terracotta: triangles", [90, 100, 40], [200, 100, 60], [50, 56, 20], "triangles", "i-africa"],
  berry: ["Berry and sky: dots", [130, 30, 100], [80, 170, 230], [255, 255, 255], "dots", "music"],

  /* ---- added: twelve more styles, so there is a colour pair for most clubs ---- */
  ember: ["Ember: copper and charcoal, dots", [156, 66, 30], [58, 56, 54], [255, 240, 226], "dots", "cooking"],
  jade: ["Jade and cream: leaves", [18, 112, 92], [236, 226, 192], [10, 58, 46], "leaves", "environment"],
  cobalt: ["Cobalt and lemon: honeycomb", [28, 60, 182], [242, 206, 62], [12, 26, 92], "hexagons", "coding"],
  plum: ["Plum and apricot: confetti", [94, 36, 92], [242, 162, 112], [58, 20, 58], "confetti", "art"],
  seaglass: ["Sea glass and sand: bubbles", [56, 140, 138], [226, 206, 172], [26, 78, 78], "bubbles", "swimming"],
  orchid: ["Orchid and mint: diamonds", [152, 82, 182], [120, 220, 190], [70, 30, 90], "diamonds", "dance"],
  rust: ["Rust and sky: triangles", [162, 72, 42], [142, 190, 230], [80, 34, 18], "triangles", "travel"],
  ink: ["Ink and paper: fine grid", [32, 36, 46], [240, 238, 230], [250, 250, 250], "grid", "news"],
  lime: ["Lime and ink: chevrons", [162, 200, 44], [30, 34, 44], [20, 30, 10], "chevrons", "fitness"],
  quartz: ["Quartz and rose: petals", [200, 190, 216], [230, 150, 162], [60, 50, 80], "petals", "yoga"],
  copper: ["Copper and navy: arc rings", [190, 112, 62], [26, 40, 92], [255, 240, 222], "arcs", "music"],
  moss: ["Moss and stone: soft waves", [92, 112, 62], [190, 186, 172], [40, 50, 26], "waves", "nature"]
};
