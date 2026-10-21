import sys, math, io, random, datetime as dt, calendar, os
sys.path.insert(0, ".")
import numpy as np, cairosvg
from stories2 import *
from PIL import ImageFont, Image, ImageDraw, ImageChops, ImageFilter
M700 = lambda px: ImageFont.truetype(F + "/manrope700.ttf", px)
M500 = lambda px: ImageFont.truetype(F + "/manrope500.ttf", px)
CAI = lambda px: ImageFont.truetype(F + "/cairo700.ttf", px)
cap = lambda px: int(px * 0.72)
OUTM = FINAL + "/month-stories"; os.makedirs(OUTM, exist_ok=True)

def hx(h): h = h.lstrip("#"); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def shade(c, a): return tuple(max(0, min(255, int(v + 255 * a))) for v in c)
def mix(a, b, t): return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))

THEMES = [
 ("January", "#E6F0FA", "#F8FBFF", "#1F4E8C", "#2F6DB5", "snow", ["#FFFFFF", "#CFE3F7", "#9CC3EA"]),
 ("February", "#FCEAF0", "#FFF8FA", "#B03A5B", "#C2557A", "blossom", ["#F8BBD0", "#F48FB1", "#FFE0EB"]),
 ("March", "#E8F6EA", "#FBFFF8", "#2E7D32", "#3C8F40", "flowers", ["#FFFFFF", "#FFD54F", "#A5D6A7"]),
 ("April", "#E4F2FB", "#F6FBFF", "#1D6FA5", "#2A82BC", "rain", ["#7FB9E6", "#A9D3F2", "#F8BBD0"]),
 ("May", "#FFEEF2", "#FFFAF6", "#BF1E5A", "#D0306C", "flowers", ["#EC407A", "#F48FB1", "#C2185B"]),
 ("June", "#FFF6D9", "#FFFDF4", "#D98200", "#E69500", "sun", ["#FFC107", "#FFB300", "#FFE082"]),
 ("July", "#DDF5F8", "#F6FEFF", "#00838F", "#0097A7", "waves", ["#4DD0E1", "#26C6DA", "#FFC107"]),
 ("August", "#FFEFDC", "#FFFAF2", "#C9601A", "#DD7125", "sun", ["#FF9800", "#F57C00", "#FFCC80"]),
 ("September", "#FFF3D6", "#FFFCF2", "#A87400", "#BC8500", "leaves", ["#F9A825", "#FBC02D", "#E6A000", "#8BC34A"]),
 ("October", "#FCE8D8", "#FFF8F1", "#C62828", "#C62828", "leaves", ["#E64A19", "#F57C00", "#FBC02D", "#C62828", "#EF6C00"]),
 ("November", "#F2E6DD", "#FBF6F2", "#7B3F20", "#8D4A26", "leaves", ["#8D4A26", "#B5651D", "#A1362B", "#C98A3D"]),
 ("December", "#E5ECF8", "#F7F9FF", "#1B3A6B", "#C62828", "snow", ["#FFFFFF", "#C7D8F2", "#E57373"]),
]
TH = {t[0]: t for t in THEMES}

OVAL = "M0 -100 C62 -58 66 48 0 100 C-66 48 -62 -58 0 -100 Z"
MAPLE = "M0 -104 L16 -66 L50 -84 L40 -38 L92 -34 L58 2 L76 46 L28 36 L0 104 L-28 36 L-76 46 L-58 2 L-92 -34 L-40 -38 L-50 -84 L-16 -66 Z"

def piece(kind, i, c, size, ang, cols):
    col = "#%02x%02x%02x" % c; col2 = "#%02x%02x%02x" % shade(c, -0.22)
    s = size / 100
    g = f'<g transform="rotate({ang}) scale({s})">'
    if kind == "oval" or kind == "maple":
        p = OVAL if kind == "oval" else MAPLE
        g = f'<defs><linearGradient id="g{i}" x1="0" y1="-100" x2="0" y2="100" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="{col}"/><stop offset="1" stop-color="{col2}"/></linearGradient></defs>' + g
        g += f'<path d="{p}" fill="url(#g{i})" stroke="url(#g{i})" stroke-width="5" stroke-linejoin="round"/><path d="M0 -90 L0 110 M0 -40 L34 -64 M0 -40 L-34 -64 M0 10 L40 -16 M0 10 L-40 -16" stroke="#fff" stroke-opacity="0.35" stroke-width="3" stroke-linecap="round" fill="none"/>'
    elif kind == "flake":
        arms = ""
        for k in range(6):
            arms += f'<g transform="rotate({k*60})"><path d="M0 0 L0 100 M0 55 L26 82 M0 55 L-26 82 M0 30 L14 44 M0 30 L-14 44"/></g>'
        g += f'<g stroke="{col}" stroke-width="8" stroke-linecap="round" fill="none">{arms}</g>'
    elif kind in ("blossom", "flower"):
        n = 5 if kind == "blossom" else 6
        pet = "".join(f'<ellipse cx="0" cy="-58" rx="{30 if kind=="flower" else 34}" ry="{50 if kind=="flower" else 44}" transform="rotate({k*360/n})" fill="{col}" fill-opacity="0.95"/>' for k in range(n))
        g += pet + f'<circle r="26" fill="{"#FFC107" if kind=="flower" else "#FFF176"}"/><circle r="26" fill="none" stroke="{col2}" stroke-width="3" stroke-opacity="0.5"/>'
    elif kind == "drop":
        g += f'<path d="M0 -100 C70 -10 64 90 0 90 C-64 90 -70 -10 0 -100Z" fill="{col}" fill-opacity="0.9"/><path d="M-22 20 C-26 46 -14 64 6 68" stroke="#fff" stroke-opacity="0.6" stroke-width="7" fill="none" stroke-linecap="round"/>'
    elif kind == "sun":
        rays = "".join(f'<line x1="0" y1="-135" x2="0" y2="{-(175 if k%2 else 205)}" transform="rotate({k*360/14})"/>' for k in range(14))
        g = f'<defs><radialGradient id="g{i}"><stop offset="0" stop-color="#FFF3C4"/><stop offset="1" stop-color="{col}"/></radialGradient></defs>' + g
        g += f'<g stroke="{col2}" stroke-width="14" stroke-linecap="round">{rays}</g><circle r="115" fill="url(#g{i})"/>'
    elif kind == "bubble":
        g += f'<circle r="90" fill="none" stroke="{col}" stroke-width="10" stroke-opacity="0.8"/><circle cx="-30" cy="-30" r="14" fill="#fff" fill-opacity="0.7"/>'
    g += "</g>"
    return g

def motif_layer(name, month):
    th = TH[name]; motif = th[5]; cols = [hx(c) for c in th[6]]; acc = hx(th[4]); ttl = hx(th[3])
    if motif == "snow": cols = [ttl, mix(acc, (255, 255, 255), 0.25), hx(th[6][2]), mix(ttl, (255, 255, 255), 0.35)]
    r = random.Random(month * 7 + 3)
    items = []
    anchors = [(40, 30, 1, 1, 3), (1040, 30, -1, 1, 4), (40, 1890, 1, -1, 3), (1040, 1890, -1, -1, 4)]
    for ci, (ax, ay, sx, sy, n) in enumerate(anchors):
        for k in range(n):
            size = r.uniform(52, 92) if k else r.uniform(80, 112)
            x = ax + sx * (r.random() ** 1.5 * 190 + (0 if k else 20)); y = ay + sy * (r.random() ** 1.4 * (110 if sy > 0 else 90) + (0 if k else 12))
            ang = r.uniform(-80, 80); c = cols[r.randrange(len(cols))]
            if motif == "leaves": kind = r.choice(["oval", "maple"])
            elif motif == "snow": kind = "flake"
            elif motif == "blossom": kind = "blossom"
            elif motif == "flowers": kind = "flower"
            elif motif == "rain": kind = "drop" if r.random() < 0.7 else "flower"; c = cols[0] if kind == "drop" and r.random() < 0.5 else (cols[1] if kind == "drop" else cols[2])
            elif motif == "sun": kind = "flower"; c = cols[0] if r.random() < 0.5 else cols[1]; size *= 0.75
            else: kind = "bubble" if sy > 0 else "drop"; c = cols[r.randrange(2)]
            items.append((kind, x, y, size, ang, c))
    if motif == "sun": items.append(("sun", 1010, 70, 70, 0, cols[0]))
    body = "".join(f'<g transform="translate({x:.1f} {y:.1f})">{piece(k, i, c, s, a, cols)}</g>' for i, (k, x, y, s, a, c) in enumerate(items))
    if motif == "waves":
        for k, (c, ph) in enumerate(((cols[0], 0), (cols[1], 1.6))):
            for side in (0, 1):
                x0 = 0 if side == 0 else 1080
                pts = "M" + " L".join(f"{x0 + (1 if side == 0 else -1) * x:.0f},{1920 - 120 - 60 * k - 18 * math.sin(x / 55 + ph) - x * 0.12:.0f}" for x in range(0, 340, 10)) + f" L{x0 + (340 if side == 0 else -340)},1920 L{x0},1920Z"
                body += f'<path d="{pts}" fill="#%02x%02x%02x" fill-opacity="{0.55 - 0.15*k}"/>' % c
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{body}</svg>'
    lay = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode(), output_width=W, output_height=H))).convert("RGBA")
    a = lay.getchannel("A").filter(ImageFilter.GaussianBlur(10)).point(lambda v: int(v * 0.2))
    sh = Image.new("RGBA", (W, H), shade(ttl, -0.4) + (255,)); sh.putalpha(a)
    mv = Image.new("RGBA", (W, H), (0, 0, 0, 0)); mv.alpha_composite(sh, (0, 8))
    return mv, lay

ICO = {
 "edu": '<path d="M22 9L12 5 2 9l10 4 10-4z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
 "speak": '<circle cx="9" cy="8" r="3"/><path d="M3 19c0-3 2.5-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.2"/><path d="M16 14c3 0 5 1.8 5 4.5"/>',
 "atom": '<ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1.3" fill="#000"/>',
 "sport": '<circle cx="6" cy="17" r="3.5"/><circle cx="18" cy="17" r="3.5"/><path d="M6 17l4.5-8H15l3 8"/><path d="M10.5 9L9 6H7.5"/><path d="M15 9l1-2.5H18"/>',
 "movie": '<rect x="3" y="9" width="18" height="11" rx="2"/><path d="M3 9l3-5M8 9l3-5M13 9l3-5M18 9l3-5"/>',
 "leaf": '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14z"/><path d="M5 19L13 11"/>',
 "flag": '<path d="M5 21V4"/><path d="M5 5h12l-2 4 2 4H5"/>',
 "laptop": '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
 "globe": '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
 "brain": '<path d="M12 4a3 3 0 0 0-5 2 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 5 2z"/><path d="M12 4a3 3 0 0 1 5 2 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-5 2z"/>',
 "book": '<path d="M12 6c-2-1.4-5-1.8-8-1.4v13c3-.4 6 0 8 1.4 2-1.4 5-1.8 8-1.4v-13c-3-.4-6 0-8 1.4z"/><path d="M12 6v13"/>',
}
def icon_img(key, px, color):
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{px}" height="{px}" viewBox="0 0 24 24"><g fill="none" stroke="rgb{color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">{ICO[key]}</g></svg>'
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode(), output_width=px, output_height=px))).convert("RGBA")

D = dt.date
# (icon, short label, long label, weekday, interval, anchor/start, end, time)
CLUBS = [
 ("speak", "Public Speaking", "Public Speaking Club", 5, 1, D(2026, 10, 3), None, "2 - 4 PM"),
 ("atom", "Philo Physics", "Philo Physics Club", 5, 1, D(2026, 10, 3), None, "4 - 6 PM"),
 ("sport", "Sports Club", "Sports Club", 5, 1, D(2026, 10, 3), None, "4 - 6 PM"),
 ("globe", "Discover Africa", "Discover Africa", 6, 1, D(2026, 10, 4), None, "2 - 4 PM"),
 ("brain", "Psychology", "Psychology Club", 6, 2, D(2026, 10, 11), None, "4 - 6 PM"),
 ("book", "Reading Club", "English Reading Club", 6, 1, D(2026, 11, 8), None, "10 AM - 12 PM"),
 ("movie", "Movie Club", "Movie Discussion Club", 2, 1, D(2026, 10, 21), None, "4 - 6 PM"),
]
CLUB_END = D(2027, 6, 30)
EVENTS = {}
for d_ in (D(2026, 10, 3), D(2026, 10, 10), D(2026, 10, 17), D(2026, 10, 24)): EVENTS.setdefault(d_, []).append(("edu", "AR:دورة الديداكتيك"))
for d_ in (D(2026, 10, 15), D(2026, 10, 22), D(2026, 10, 29), D(2026, 11, 5), D(2026, 11, 12)): EVENTS.setdefault(d_, []).append(("leaf", "BEGOAS"))
EVENTS.setdefault(D(2026, 10, 16), []).append(("flag", "Fulbright"))
EVENTS.setdefault(D(2026, 10, 23), []).append(("laptop", "Cyber Month"))
CLOSED = {D(2026, 10, 31): "Unity Day", D(2026, 11, 6): "Green March", D(2026, 11, 18): "Independence Day", D(2027, 1, 1): "New Year", D(2027, 1, 11): "Assessment", D(2027, 1, 14): "Assessment", D(2027, 5, 1): "Labour Day"}
OCC = {D(2026, 11, 26): "Thanksgiving", D(2026, 12, 25): "Christmas", D(2027, 2, 14): "Valentine's"}
OCC[D(2027, 4, 22)] = "Earth Day"

def club_on(c, day):
    ic, sh, lg, wd, itv, a0, _, tm = c
    if day.weekday() != wd or day < a0 or day > CLUB_END: return False
    return ((day - a0).days // 7) % itv == 0

def make(name, year):
    th = TH[name]; midx = [t[0] for t in THEMES].index(name) + 1
    T = hx(th[3]); A = hx(th[4])
    INK = shade(T, -0.38); EVC = A if th[0] != "October" else (198, 40, 40); CLC = shade(T, -0.30) if T[2] > 100 else shade(T, -0.28)
    if name == "October": INK = (58, 24, 30); CLC = (22, 38, 100)
    # background: pearl washed with the month colours
    pearl = c2.bg_light().convert("RGB")
    yy = np.linspace(0, 1, H)[:, None, None]
    b0, b1 = np.array(hx(th[1]), dtype=np.float32), np.array(hx(th[2]), dtype=np.float32)
    wash = (b0 * (1 - yy) + b1 * yy) * np.ones((1, W, 1))
    img = Image.blend(pearl, Image.fromarray(wash.astype(np.uint8), "RGB"), 0.6).convert("RGBA")
    sh_, lay = motif_layer(name, midx)
    img = Image.alpha_composite(Image.alpha_composite(img, sh_), lay)
    img = logo_at(img, 120, 84)
    word = name.upper()
    f = c2.fit_font(F + "/bodoni600i.ttf", word, 820, 150, -6)
    m0 = line_mask(word, f, 1000, -6); y0b = bb(m0)[1]
    base = 1000 + (200 - y0b); m = line_mask(word, f, base, -6)
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sh.paste((40, 30, 60, 255), (0, 0), ImageChops.offset(m, 0, 10).filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * 0.26)))
    img = Image.alpha_composite(img, sh)
    bx0, by0, bx1, by1 = bb(m)
    stops = [shade(T, -0.2), T, A, mix(A, (255, 255, 255), 0.25)] if name != "October" else [(118, 20, 40), (196, 36, 40), (232, 104, 32), (240, 150, 38)]
    xs = np.clip((np.arange(W) - bx0) / max(1, bx1 - bx0), 0, 1) * (len(stops) - 1)
    i = np.minimum(xs.astype(int), len(stops) - 2); t = xs - i
    col = np.array(stops, dtype=np.float32); rgb = col[i] * (1 - t)[:, None] + col[i + 1] * t[:, None]
    arr = np.zeros((H, W, 4), np.uint8); arr[..., :3] = rgb[None, :, :].astype(np.uint8); arr[..., 3] = np.asarray(m)
    img = Image.alpha_composite(img, Image.fromarray(arr, "RGBA"))
    DK, OR = (stops[0], stops[-1]) if name != "October" else ((118, 20, 40), (232, 110, 32))
    d = ImageDraw.Draw(img)
    sub_b = by1 + 44 + cap(26)
    cm.spaced(d, f"{year}   ·   CLUBS AND EVENTS", M700(26), CX, sub_b, INK + (255,), 8)
    for sx, x0l, x1l in [(96, 126, 236), (984, 844, 954)]:
        ln = Image.new("L", (W, H), 0); y_ = sub_b - 9
        ImageDraw.Draw(ln).rectangle([x0l, y_, x1l, y_ + 1], fill=255)
        img = Image.alpha_composite(img, cm.gradient_fill(ln, x0l, x1l, DK, OR)); d = ImageDraw.Draw(img)
        pts = [(sx + (12 if k % 2 == 0 else 5) * math.cos(-math.pi / 2 + k * math.pi / 5), y_ + (12 if k % 2 == 0 else 5) * math.sin(-math.pi / 2 + k * math.pi / 5)) for k in range(10)]
        d.polygon(pts, fill=EVC + (255,))
    d = ImageDraw.Draw(img)
    LEFT = 60; CW = [88, 88, 140, 140, 150, 184, 170]; CX0 = [LEFT + sum(CW[:k]) for k in range(7)]
    first = D(year, midx, 1); ndays = calendar.monthrange(year, midx)[1]
    cells = [None] * first.weekday() + list(range(1, ndays + 1))
    while len(cells) % 7: cells.append(None)
    rows = len(cells) // 7
    RH = {4: 150, 5: 136, 6: 122}[rows]
    wd_b = sub_b + 66
    for k, n in enumerate(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]):
        cm.spaced(d, n, M700(20), int(CX0[k] + CW[k] / 2), wd_b, (INK if k < 5 else EVC) + (255,), 5)
    G0 = wd_b + 22
    def hline(y, a=255):
        ln = Image.new("L", (W, H), 0); ImageDraw.Draw(ln).rectangle([LEFT, int(y), LEFT + 960, int(y) + 1], fill=a)
        return cm.gradient_fill(ln, LEFT, LEFT + 960, DK, OR)
    def vline(x, y0, y1, a=70):
        ln = Image.new("L", (W, H), 0); ImageDraw.Draw(ln).rectangle([int(x), int(y0), int(x) + 1, int(y1)], fill=a)
        return cm.gradient_fill(ln, 0, W, DK, DK)
    img = Image.alpha_composite(img, hline(G0))
    for r in range(rows):
        ytop = G0 + r * RH
        for c in range(7):
            n = cells[r * 7 + c]
            if n is None: continue
            day = D(year, midx, n); x0c = CX0[c]
            closed = day in CLOSED
            if closed:
                hm = Image.new("L", (W, H), 0)
                xa, xb, ya, yb_ = int(x0c) + 5, int(x0c + CW[c]) - 5, int(ytop) + 8, int(ytop + RH) - 8
                for k in range(-300, 400, 15): ImageDraw.Draw(hm).line([(xa + k, yb_), (xa + k + 140, ya)], fill=255, width=2)
                clip = Image.new("L", (W, H), 0); ImageDraw.Draw(clip).rounded_rectangle([xa, ya, xb, yb_], radius=12, fill=255)
                hat = Image.new("RGBA", (W, H), EVC + (0,)); hat.putalpha(ImageChops.multiply(hm, clip).point(lambda v: int(v * 0.30)))
                img = Image.alpha_composite(img, hat)
            items = []
            if not closed:
                for cl in CLUBS:
                    if club_on(cl, day): items.append((cl[0], cl[1], "C"))
                for ic, lab in EVENTS.get(day, []): items.append((ic, lab, "E"))
            d = ImageDraw.Draw(img)
            has = bool(items) or closed
            d.text((x0c + 10, ytop + 12), str(n), font=M700(24), fill=INK + ((255 if has else 140),))
            yy_ = ytop + 46
            for ic, lab, kind in items:
                colr = CLC if kind == "C" else EVC
                img.alpha_composite(icon_img(ic, 20, colr), (int(x0c + 10), int(yy_)))
                d = ImageDraw.Draw(img)
                if lab.startswith("AR:"): d.text((x0c + 36, yy_ + 10), lab[3:], font=CAI(16), fill=colr + (255,), anchor="lm", direction="rtl", language="ar")
                else: d.text((x0c + 36, yy_ + 10), lab, font=M700(15), fill=colr + (255,), anchor="lm")
                yy_ += 22
            if closed:
                cm.spaced(d, "CLOSED", M700(16), int(x0c + CW[c] / 2), int(ytop + 92), EVC + (255,), 3)
                d.text((x0c + CW[c] / 2, ytop + 112), CLOSED[day], font=M500(13), fill=EVC + (230,), anchor="mm")
            elif day in OCC:
                d.text((x0c + 10, ytop + RH - 18), OCC[day], font=M500(14), fill=INK + (190,), anchor="lm")
        img = Image.alpha_composite(img, hline(G0 + (r + 1) * RH, 150 if r < rows - 1 else 255))
    G1 = G0 + rows * RH
    for k in range(1, 7): img = Image.alpha_composite(img, vline(CX0[k], G0, G1, 55))
    # list below
    month_days = [D(year, midx, n) for n in range(1, ndays + 1)]
    groups = []
    for wdn, wname in ((5, "EVERY SATURDAY"), (6, "EVERY SUNDAY"), (2, "EVERY WEDNESDAY")):
        rows_ = []
        for cl in CLUBS:
            if cl[3] == wdn and any(club_on(cl, x) for x in month_days if x not in CLOSED):
                sub = "every other Sunday" if cl[4] == 2 else ("Lala Aisha Park" if cl[1] == "Sports Club" else "")
                rows_.append((cl[2], sub, cl[7]))
        if rows_: groups.append((wname, rows_))
    ev = []
    if name == "October":
        ev = [("AR:دورة مجانية الديداكتيك والتشريع التربوي", "", "Sat 3 - 24 Oct,  10 AM - 12 PM"), ("BEGOAS Eco Impact", "Thursdays until 12 Nov", "4 - 6 PM"), ("Fulbright Info Session", "Fri 16 Oct", "2:30 - 4:30 PM"), ("Cybersecurity Awareness", "Fri 23 Oct", "3 - 5 PM")]
    elif name == "November":
        ev = [("BEGOAS Eco Impact", "Thursdays 5 and 12 Nov", "4 - 6 PM")]
    if ev: groups.append(("EVENTS", ev))
    if not groups: groups = [("SCHEDULE", [("Summer programme coming soon", "", "")])]
    XL, XR = 130, 950
    LH = 36; HH = 28
    tot = sum(HH + 14 + LH * len(r_) + 20 for _, r_ in groups)
    if G1 + 36 + tot > 1835: LH = 32
    y = G1 + 36
    for gname, rws in groups:
        d = ImageDraw.Draw(img)
        wlab = sum(d.textlength(ch, font=M700(19)) + 5 for ch in gname)
        cm.spaced(d, gname, M700(19), int(XL + wlab / 2), y + cap(19), EVC + (255,), 5)
        d.line([(XL + wlab + 14, y + cap(19) // 2 + 2), (XR, y + cap(19) // 2 + 2)], fill=EVC + (120,), width=2)
        y += cap(19) + 16
        for nm, sub, tm in rws:
            if nm.startswith("AR:"):
                d.text((XR, y + 18), nm[3:], font=CAI(27), fill=INK + (255,), anchor="rm", direction="rtl", language="ar")
                d.text((XL, y + 20), tm, font=M500(20), fill=INK + (255,), anchor="lm"); y += LH + 2; continue
            d.text((XL, y + 18), nm, font=M700(23), fill=INK + (255,), anchor="lm")
            wn = d.textlength(nm, font=M700(23))
            if sub: d.text((XL + wn + 12, y + 20), sub, font=M500(18), fill=EVC + (255,), anchor="lm")
            d.text((XR, y + 18), tm, font=M500(21), fill=INK + (255,), anchor="rm")
            y += LH
        y += 20
    noise = Image.effect_noise((W, H), 46).convert("L")
    grain = Image.merge("RGBA", (noise, noise, noise, Image.new("L", (W, H), 18)))
    res = Image.alpha_composite(img, grain).convert("RGB")
    res.save(f"{OUTM}/{midx:02d}-{name.lower()}-{year}.png"); print(name, year, "end", y, flush=True)
    return res

PLAN = [("October", 2026), ("November", 2026), ("December", 2026), ("January", 2027), ("February", 2027), ("March", 2027), ("April", 2027), ("May", 2027), ("June", 2027), ("July", 2027), ("August", 2027), ("September", 2027)]
if __name__ == "__main__":
    only = sys.argv[1:] 
    ims = []
    for n, y in PLAN:
        if only and n not in only: continue
        ims.append(make(n, y))
    if not only:
        tw, th_, gp = 270, 480, 20
        cols = 6
        sheet = Image.new("RGB", (cols * tw + (cols + 1) * gp, 2 * th_ + 3 * gp), (22, 22, 22))
        for k, s_ in enumerate(ims): sheet.paste(s_.resize((tw, th_), Image.LANCZOS), (gp + (k % cols) * (tw + gp), gp + (k // cols) * (th_ + gp)))
        sheet.save(FINAL + "/months-sheet.png")
