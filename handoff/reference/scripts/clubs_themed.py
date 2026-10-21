import sys, io, math, random
sys.path.insert(0, ".")
import numpy as np
import cairosvg
import stories2 as S
from stories2 import bb, shift, line_mask, title_layout, icon_masks, logo_at, LOGO, c2, cm, FINAL, W, H, CX, F, PILL_H
from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageFilter
import os
OUTD = FINAL + "/club-stories"; os.makedirs(OUTD, exist_ok=True)
PEARL = (244, 240, 232)

def rgb(c, a=1.0): return f"rgba({c[0]},{c[1]},{c[2]},{a})"

def svg_layer(body):
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{body}</svg>'
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode(), output_width=W, output_height=H))).convert("RGBA")

def decor_movie(c1, c2_):
    b = ""
    for x0 in (0, 1028):
        b += f'<rect x="{x0}" y="0" width="52" height="1920" fill="{rgb(c1,0.93)}"/>'
        hx = x0 + 14
        for y in range(18, 1920, 64):
            b += f'<rect x="{hx}" y="{y}" width="24" height="34" rx="6" fill="rgb{PEARL}"/>'
    b += f'<rect x="52" y="0" width="3" height="1920" fill="{rgb(c2_,0.9)}"/><rect x="1025" y="0" width="3" height="1920" fill="{rgb(c2_,0.9)}"/>'
    return svg_layer(b)

def decor_speaking(c1, c2_):
    b = ""
    for (cx, cy) in ((0, 1920), (1080, 1920)):
        for i, r in enumerate(range(150, 480, 48)):
            b += f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{rgb(c2_ if i%2 else c1, 0.75-0.08*i)}" stroke-width="8"/>'
    return svg_layer(b)

def decor_philo(c1, c2_):
    b = ""
    def atom(cx, cy):
        s = ""
        for ang in (0, 60, 120):
            s += f'<ellipse cx="{cx}" cy="{cy}" rx="250" ry="86" transform="rotate({ang} {cx} {cy})" fill="none" stroke="{rgb(c1,0.6)}" stroke-width="5"/>'
            a = math.radians(ang + 35)
            ex, ey = 250 * math.cos(math.radians(35)), 86 * math.sin(math.radians(35))
            x = cx + ex * math.cos(math.radians(ang)) - ey * math.sin(math.radians(ang))
            y = cy + ex * math.sin(math.radians(ang)) + ey * math.cos(math.radians(ang))
            s += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="13" fill="{rgb(c2_,0.95)}"/>'
        s += f'<circle cx="{cx}" cy="{cy}" r="20" fill="{rgb(c2_,0.95)}"/>'
        return s
    b += atom(30, 1900) + atom(1050, 1900)
    rnd = random.Random(5)
    for (x, y, r) in [(70, 470, 20), (1010, 430, 16), (130, 760, 14), (960, 700, 22), (60, 980, 12), (1020, 1000, 14)]:
        b += f'<path d="M{x} {y-r} Q{x} {y} {x+r} {y} Q{x} {y} {x} {y+r} Q{x} {y} {x-r} {y} Q{x} {y} {x} {y-r} Z" fill="{rgb(c2_,0.8)}"/>'
    return svg_layer(b)

def decor_sports(c1, c2_):
    b = ""
    for (sx, sy, flip) in ((1080, 0, 1), (0, 1920, -1)):
        for s_, w_, col in [(180, 30, c1), (138, 12, c2_), (104, 22, c1), (66, 9, c2_)]:
            x1, y1 = sx - flip * s_, sy
            x2, y2 = sx, sy + flip * s_
            b += f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{rgb(col,0.92)}" stroke-width="{w_}"/>'
    return svg_layer(b)

def decor_africa(c1, c2_):
    b = ""
    for (y0, d) in ((0, 1), (1920, -1)):
        for i, x in enumerate(range(-23, 1103, 46)):
            col = c1 if i % 2 == 0 else c2_
            b += f'<polygon points="{x},{y0} {x+46},{y0} {x+23},{y0+d*46}" fill="{rgb(col,0.95)}"/>'
        for i, x in enumerate(range(0, 1100, 46)):
            b += f'<rect x="{x+16}" y="{y0+d*62-6 if d>0 else y0+d*62-6}" width="12" height="12" transform="rotate(45 {x+22} {y0+d*62})" fill="{rgb(c1,0.9)}"/>'
    return svg_layer(b)

def decor_psy(c1, c2_):
    L = '<path d="M12 4a3 3 0 0 0-5 2 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 5 2z"/>'
    R = '<path d="M12 4a3 3 0 0 1 5 2 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-5 2z"/>'
    fold = '<path d="M9 8.5c1 .6 1.8.6 3 0M8 13c1.2-.6 2.4-.6 4 0M15 8.5c-1 .6-1.8.6-3 0M16 13c-1.2-.6-2.4-.6-4 0"/>'
    b = f'<g transform="translate(6 1230) scale(7.9)" fill="none" stroke="{rgb(c1,0.55)}" stroke-width="0.42" stroke-linecap="round" stroke-linejoin="round">{L}{R}{fold}</g>'
    b += f'<g transform="translate(886 1230) scale(7.9)" fill="none" stroke="{rgb(c2_,0.65)}" stroke-width="0.42" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17.5c-2-1.4-3.4-3.6-3.4-6.2a6.4 6.4 0 0 1 12.8 0c0 2.6-1.4 4.8-3.4 6.2z"/><path d="M9.6 20h4.8M10.6 22.4h2.8"/><path d="M12 2V.4M4.6 4.2L3.4 3M19.4 4.2L20.6 3M2 11.4H.4M22 11.4h1.6"/></g>'
    for (x, y, r, k) in [(96, 1196, 8, 0), (74, 1160, 12, 1), (96, 1114, 17, 0)]:
        b += f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="{rgb(c1,0.5)}" stroke-width="3"/>'
    for (x, y, r) in [(984, 1196, 8), (1006, 1160, 12), (984, 1114, 17)]:
        b += f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="{rgb(c2_,0.55)}" stroke-width="3"/>'
    return svg_layer(b)

THEMES = {
 "movie-discussion": ((96, 18, 40), (222, 158, 38), (58, 14, 28), decor_movie),
 "public-speaking": ((18, 52, 138), (240, 90, 70), (14, 26, 74), decor_speaking),
 "philo-physics": ((46, 34, 128), (20, 150, 170), (28, 24, 86), decor_philo),
 "sports": ((14, 104, 76), (238, 120, 32), (10, 60, 46), decor_sports),
 "discover-africa": ((150, 46, 22), (228, 160, 36), (84, 30, 16), decor_africa),
 "psychology": ((76, 34, 130), (196, 48, 122), (50, 22, 90), decor_psy),
}

def rrect(box, r, w=None):
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle(box, radius=r, fill=None if w else 255, outline=255 if w else None, width=w or 0)
    return m

def club(slug, kicker, top, word, sched, time, venue):
    c1, c2_, ink, decor = THEMES[slug]
    S.NAVY, S.RED = c1, c2_
    img = c2.bg_light().convert("RGBA")
    glow = Image.new("RGBA", (W, H), c2_ + (0,))
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    g = np.clip(1 - np.hypot((xx - 540) / 720, (yy - 1300) / 620), 0, 1) ** 1.6
    glow.putalpha(Image.fromarray((g * 38).astype(np.uint8)))
    img = Image.alpha_composite(img, glow)
    img = Image.alpha_composite(img, decor(c1, c2_))
    ROW = 165
    # small ASO logo, centred
    img = logo_at(img, ROW, 78)
    # very small club icon, bottom centre
    f_k = ImageFont.truetype(F + "/manrope700.ttf", 25)
    f_day = ImageFont.truetype(F + "/manrope700.ttf", 42)
    f_info = ImageFont.truetype(F + "/manrope500.ttf", 30)
    f_small = ImageFont.truetype(F + "/manrope700.ttf", 23)
    cap = lambda px: int(px * 0.72)
    fw, ft, gap, t_top, w_bot = title_layout(top, word, 175, 92)
    single = not top
    g1, g2, g3, g4 = (62, 64, 66, 34) if single else (40, 46, 46, 26)
    B = cap(25) + g1 + (w_bot - t_top) + g2 + g3 + cap(42) + g4 + cap(30)
    y = int(204 + (860 - 204 - B) / 2) - 8
    d = ImageDraw.Draw(img)
    cm.spaced(d, kicker, f_k, CX, y + cap(25), tuple(int(v * 0.72) for v in c2_) + (255,), 7)
    ty = y + cap(25) + g1
    img = S.draw_title(img, fw, ft, gap, top, word, int(ty - t_top))
    tb = ty + (w_bot - t_top)
    hl = tb + g2
    ln = Image.new("L", (W, H), 0); ImageDraw.Draw(ln).rectangle([CX - 260, hl, CX + 260, hl + 2], fill=255)
    img = Image.alpha_composite(img, cm.gradient_fill(ln, CX - 260, CX + 260, c1, c2_))
    d = ImageDraw.Draw(img)
    yb = hl + g3 + cap(42)
    cm.spaced(d, sched, f_day, CX, yb, ink + (255,), 8)
    yb2 = yb + g4 + cap(30)
    cm.spaced(d, f"{time}   |   {venue}", f_info, CX, yb2, ink + (235,), 3)
    top_s, bot_s = 860, 1760
    ww = int((bot_s - top_s) * 3 / 4); x0 = CX - ww // 2
    bx = [x0, top_s, x0 + ww, bot_s]
    fill = Image.new("RGBA", (W, H), (252, 250, 246, 255)); fill.putalpha(rrect(bx, 26).point(lambda v: int(v * 0.92)))
    img = Image.alpha_composite(img, fill)
    img = Image.alpha_composite(img, cm.gradient_fill(rrect(bx, 26, 3), bx[0], bx[2], c1, c2_))
    d = ImageDraw.Draw(img)
    cm.spaced(d, "POSTER 3:4", f_small, CX, (top_s + bot_s) // 2, ink + (110,), 6)
    py = 1792
    pf = Image.new("RGBA", (W, H), (250, 247, 241, 255)); pf.putalpha(rrect([CX - 300, py, CX + 300, py + 84], 42).point(lambda v: int(v * 0.95)))
    img = Image.alpha_composite(img, pf)
    pill = rrect([CX - 300, py, CX + 300, py + 84], 42, 3)
    img = Image.alpha_composite(img, cm.gradient_fill(pill, CX - 300, CX + 300, c1, c2_))
    d = ImageDraw.Draw(img)
    cm.spaced(d, "WHATSAPP GROUP LINK HERE", ImageFont.truetype(F + "/manrope700.ttf", 22), CX, py + 42 + 8, ink + (170,), 5)
    noise = Image.effect_noise((W, H), 46).convert("L")
    grain = Image.merge("RGBA", (noise, noise, noise, Image.new("L", (W, H), 18)))
    res = Image.alpha_composite(img, grain).convert("RGB")
    res.save(f"{OUTD}/club-{slug}.png"); print(slug, flush=True)
    return res

CL = [
 ("movie-discussion", "WEEKLY CLUB", "MOVIE", "DISCUSSION", "EVERY WEDNESDAY", "4:00 - 6:00 PM", "MAIN HALL"),
 ("public-speaking", "WEEKLY CLUB", "PUBLIC", "SPEAKING", "EVERY SATURDAY", "2:00 - 4:00 PM", "MAIN HALL"),
 ("philo-physics", "WEEKLY CLUB", "PHILO", "PHYSICS", "EVERY SATURDAY", "4:00 - 6:00 PM", "MAIN HALL"),
 ("sports", "WEEKLY CLUB", "AMERICAN SPACE", "SPORTS", "EVERY SATURDAY", "4:00 - 6:00 PM", "LALA AISHA PARK"),
 ("discover-africa", "WEEKLY CLUB", "DISCOVER", "AFRICA", "EVERY SUNDAY", "2:00 - 4:00 PM", "MAIN HALL"),
 ("psychology", "BIWEEKLY CLUB", "", "PSYCHOLOGY", "EVERY OTHER SUNDAY", "4:00 - 6:00 PM", "MAIN HALL"),
]
if __name__ == "__main__":
    ims = [club(*c) for c in CL]
    tw, th, gp = 300, 533, 24
    sheet = Image.new("RGB", (len(ims) * tw + (len(ims) + 1) * gp, th + 2 * gp), (22, 22, 22))
    for i, s_ in enumerate(ims):
        sheet.paste(s_.resize((tw, th), Image.LANCZOS), (gp + i * (tw + gp), gp))
    sheet.save(FINAL + "/club-stories-sheet.png"); print("FIN")
