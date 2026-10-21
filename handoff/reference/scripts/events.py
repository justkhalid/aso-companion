import sys, math, random, os
sys.path.insert(0, ".")
import clubs_themed as CT
from clubs_themed import *
OUTE = FINAL + "/event-stories"; os.makedirs(OUTE, exist_ok=True)

def G(path, tx, ty, sc, col, a, sw=0.45):
    return f'<g transform="translate({tx} {ty}) scale({sc})" fill="none" stroke="{rgb(col,a)}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{path}</g>'

def decor_reading(c1, c2_):
    book = '<path d="M12 6c-2-1.4-5-1.8-8-1.4v13c3-.4 6 0 8 1.4 2-1.400 5-1.8 8-1.4v-13c-3-.4-6 0-8 1.4z"/><path d="M12 6v13"/><path d="M5.5 8.2c1.800-.2 3.600 0 5 .8M5.5 11.2c1.800-.2 3.600 0 5 .8M13.500 9c1.400-.8 3.200-1 5-.8M13.500 12c1.400-.8 3.200-1 5-.8"/>'
    b = G(book, 12, 1330, 7.2, c1, 0.6, 0.5)
    b += G(book, 898, 1330, 7.2, c2_, 0.65, 0.5)
    for (x, y, r) in [(80, 470, 10), (1000, 440, 8), (950, 760, 12), (110, 840, 8)]:
        b += f'<path d="M{x} {y-r} Q{x} {y} {x+r} {y} Q{x} {y} {x} {y+r} Q{x} {y} {x-r} {y} Q{x} {y} {x} {y-r}Z" fill="{rgb(c2_,0.7)}"/>'
    return svg_layer(b)

def decor_course(c1, c2_):
    cap = '<path d="M22 9L12 5 2 9l10 4 10-4z"/><path d="M6 11v5c0 1.500 3 3 6 3s6-1.500 6-3v-5"/><path d="M22 9v6"/>'
    b = G(cap, 22, 1330, 6.4, c1, 0.65, 0.5)
    # ruled notebook
    b += f'<rect x="900" y="1300" width="140" height="190" rx="14" fill="none" stroke="{rgb(c2_,0.6)}" stroke-width="4"/>'
    for i in range(6):
        b += f'<line x1="918" y1="{1340+i*20}" x2="1024" y2="{1340+i*20}" stroke="{rgb(c2_,0.5)}" stroke-width="3"/>'
    b += f'<line x1="918" y1="1316" x2="918" y2="1474" stroke="{rgb(c1,0.5)}" stroke-width="3"/>'
    # gold rules top corners
    for (x0, x1, y) in ((0, 150, 70), (930, 1080, 70), (0, 110, 90), (970, 1080, 90)):
        b += f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="{rgb(c2_,0.9)}" stroke-width="5"/>'
    return svg_layer(b)

def decor_cyber(c1, c2_):
    b = ""
    rnd = random.Random(8)
    def trace(x, y, dirx, diry):
        s = ""; px, py = x, y
        for k in range(5):
            n = 50 + rnd.randint(0, 60)
            nx, ny = (px + dirx * n, py) if k % 2 == 0 else (px, py + diry * n)
            s += f'<line x1="{px}" y1="{py}" x2="{nx}" y2="{ny}" stroke="{rgb(c1,0.6)}" stroke-width="4"/><circle cx="{nx}" cy="{ny}" r="9" fill="none" stroke="{rgb(c2_,0.9)}" stroke-width="4"/>'
            px, py = nx, ny
        return s
    b += trace(0, 1500, 1, -1) + trace(0, 1640, 1, -1) + trace(1080, 1480, -1, -1) + trace(1080, 1620, -1, -1)
    b += trace(0, 90, 1, 1) + trace(1080, 110, -1, 1)
    shield = '<path d="M12 2.500l7.500 2.700v6c0 4.400-3 8.200-7.500 10.300-4.500-2.100-7.500-5.900-7.500-10.300v-6z"/><circle cx="12" cy="10.500" r="1.800"/><path d="M12 12.300v3.200"/>'
    b += G(shield, 904, 1330, 6.6, c2_, 0.7, 0.5)
    return svg_layer(b)

def leafp(cx, cy, s, ang, col, a):
    return f'<g transform="rotate({ang} {cx} {cy})"><path d="M{cx} {cy-s} C{cx+s*0.8} {cy-s*0.4} {cx+s*0.7} {cy+s*0.5} {cx} {cy+s} C{cx-s*0.7} {cy+s*0.5} {cx-s*0.8} {cy-s*0.4} {cx} {cy-s}Z" fill="{rgb(col,a)}"/><line x1="{cx}" y1="{cy-s*0.8}" x2="{cx}" y2="{cy+s}" stroke="rgba(255,255,255,0.55)" stroke-width="3"/></g>'

def decor_eco(c1, c2_):
    b = ""
    rnd = random.Random(12)
    for (bx, by, sgn) in ((0, 1500, 1), (1080, 1500, -1)):
        px, py = bx, by
        b += f'<path d="M{bx} {by+260} C{bx+sgn*110} {by+150} {bx+sgn*40} {by+40} {bx+sgn*150} {by-120}" fill="none" stroke="{rgb(c1,0.7)}" stroke-width="6"/>'
        for k in range(7):
            t = k / 6
            x = bx + sgn * (40 + 110 * t * (1 if k % 2 else 0.6)); y = by + 230 - 340 * t
            b += leafp(x + sgn * (26 if k % 2 else -4), y, 38 - 3 * k, sgn * (40 if k % 2 else -50), c1 if k % 2 else c2_, 0.85)
    for (x, y, s, ang, col) in [(80, 150, 30, 40, c2_), (1000, 130, 34, -40, c1), (150, 230, 22, 20, c1), (940, 240, 24, -20, c2_)]:
        b += leafp(x, y, s, ang, col, 0.85)
    return svg_layer(b)

THEMES.update({
 "english-reading": ((20, 84, 62), (196, 140, 54), (14, 52, 40), decor_reading),
 "free-course": ((18, 40, 110), (200, 150, 40), (12, 26, 74), decor_course),
 "cybersecurity": ((8, 96, 112), (60, 90, 200), (6, 54, 70), decor_cyber),
 "begoas": ((24, 120, 56), (140, 180, 40), (14, 70, 36), decor_eco),
})

def event(slug, kicker, top, word, sched, info, arabic=False, icon="events"):
    c1, c2_, ink, decor = THEMES[slug]
    S.NAVY, S.RED = c1, c2_
    img = c2.bg_light().convert("RGBA")
    glow = Image.new("RGBA", (W, H), c2_ + (0,))
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    g = np.clip(1 - np.hypot((xx - 540) / 720, (yy - 1300) / 620), 0, 1) ** 1.6
    glow.putalpha(Image.fromarray((g * 38).astype(np.uint8)))
    img = Image.alpha_composite(img, glow)
    img = Image.alpha_composite(img, decor(c1, c2_))
    img = logo_at(img, 165, 78)
    ms, ma, box = icon_masks(icon, 64, 540, 1838)
    img = S.paint_icon(img, ms, ma, box)
    f_day = ImageFont.truetype(F + "/manrope700.ttf", 40)
    f_info = ImageFont.truetype(F + "/manrope500.ttf", 30)
    f_small = ImageFont.truetype(F + "/manrope700.ttf", 23)
    cap = lambda px: int(px * 0.72)
    fw, ft, gap, t_top, w_bot = title_layout(top, word, 175, 92)
    y = 318
    d = ImageDraw.Draw(img)
    kc = tuple(int(v * 0.72) for v in c2_) + (255,)
    if arabic:
        d.text((CX, y + 14), kicker, font=ImageFont.truetype(F + "/cairo700.ttf", 36), fill=kc, anchor="mm", direction="rtl", language="ar")
    else:
        cm.spaced(d, kicker, ImageFont.truetype(F + "/manrope700.ttf", 25), CX, y + cap(25), kc, 7)
    ty = y + cap(25) + 40
    img = S.draw_title(img, fw, ft, gap, top, word, int(ty - t_top))
    tb = ty + (w_bot - t_top); hl = tb + 46
    ln = Image.new("L", (W, H), 0); ImageDraw.Draw(ln).rectangle([CX - 260, hl, CX + 260, hl + 2], fill=255)
    img = Image.alpha_composite(img, cm.gradient_fill(ln, CX - 260, CX + 260, c1, c2_))
    d = ImageDraw.Draw(img)
    yb = hl + 46 + cap(40)
    cm.spaced(d, sched, f_day, CX, yb, ink + (255,), 7)
    yb2 = yb + 26 + cap(30)
    cm.spaced(d, info, f_info, CX, yb2, ink + (235,), 3)
    top_s, bot_s = 860, 1760
    ww = int((bot_s - top_s) * 3 / 4); x0 = CX - ww // 2
    bx = [x0, top_s, x0 + ww, bot_s]
    fill = Image.new("RGBA", (W, H), (252, 250, 246, 255)); fill.putalpha(rrect(bx, 26).point(lambda v: int(v * 0.92)))
    img = Image.alpha_composite(img, fill)
    img = Image.alpha_composite(img, cm.gradient_fill(rrect(bx, 26, 3), bx[0], bx[2], c1, c2_))
    d = ImageDraw.Draw(img)
    cm.spaced(d, "POSTER 3:4", f_small, CX, (top_s + bot_s) // 2, ink + (110,), 6)
    noise = Image.effect_noise((W, H), 46).convert("L")
    grain = Image.merge("RGBA", (noise, noise, noise, Image.new("L", (W, H), 18)))
    res = Image.alpha_composite(img, grain).convert("RGB")
    out = f"{OUTE}/{slug}.png"; res.save(out); print(slug, flush=True)
    return res

if __name__ == "__main__":
    ims = [
     event("free-course", "دورة مجانية الديداكتيك والتشريع التربوي", "FREE", "COURSE", "SATURDAYS, LAST SESSION 24 OCT", "10:00 AM - 12:00 PM   |   MAIN HALL", True),
     event("cybersecurity", "AWARENESS MONTH", "CYBERSECURITY", "AWARENESS", "FRIDAY 23 OCTOBER", "3:00 - 5:00 PM   |   AMERICAN SPACE OUJDA"),
     event("begoas", "LEARN. PRACTICE. SERVE. PROTECT.", "BEGOAS", "ECO IMPACT", "EVERY THURSDAY UNTIL 12 NOV", "4:00 - 6:00 PM   |   MAIN HALL"),
    ]
    CT.OUTD = FINAL + "/club-stories"
    ims.append(CT.club("english-reading", "WEEKLY CLUB", "ENGLISH", "READING", "EVERY SUNDAY", "10:00 AM - 12:00 PM", "MAIN HALL"))
    tw, th, gp = 300, 533, 24
    sheet = Image.new("RGB", (len(ims) * tw + (len(ims) + 1) * gp, th + 2 * gp), (22, 22, 22))
    for i, s_ in enumerate(ims): sheet.paste(s_.resize((tw, th), Image.LANCZOS), (gp + i * (tw + gp), gp))
    sheet.save(FINAL + "/events-sheet.png"); print("FIN")
