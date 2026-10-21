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
  }
};
export const DECOR_NAMES: Record<string, string> = { none: "None", film: "Film strips", rings: "Sound rings", atoms: "Atoms and sparkles", stripes: "Corner stripes", triangles: "Triangle pattern", brain: "Brain and bulb", books: "Open books", leaves: "Leaves" };
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
  gold: ["Navy and gold: books", [18, 40, 110], [200, 150, 40], [12, 26, 74], "books", "ai"]
};
