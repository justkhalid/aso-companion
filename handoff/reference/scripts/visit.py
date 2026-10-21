import sys, os
sys.path.insert(0, ".")
import numpy as np
import stories2 as S
import stories as st
from stories2 import *
import clubs_themed as CT
from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageFilter
NAVY, RED = (14, 26, 74), (214, 34, 43)
S.NAVY, S.RED = NAVY, RED
OUT = FINAL + "/visit-stories"; os.makedirs(OUT, exist_ok=True)
cap = lambda px: int(px * 0.72)
M = lambda w, px: ImageFont.truetype(F + f"/manrope{w}.ttf", px)

from clubs_themed import rrect
def map_slot(img, box, label=None):
    gm = Image.open("gmap.jpg").convert("RGB").crop((60, 60, 800, 600))
    bw, bh = box[2] - box[0], box[3] - box[1]
    gm = gm.resize((bw, bh), Image.LANCZOS)
    m = rrect(box, 34)
    sh = Image.new("RGBA", (W, H), (30, 30, 60, 0)); sh.putalpha(ImageChops.offset(m, 0, 14).filter(ImageFilter.GaussianBlur(22)).point(lambda v: int(v * 0.35)))
    img = Image.alpha_composite(img, sh)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0)); layer.paste(gm.convert("RGBA"), (box[0], box[1]))
    layer.putalpha(m)
    img = Image.alpha_composite(img, layer)
    # pin at the map centre (400,300 in screenshot -> crop 340,240)
    px = box[0] + int(312 * bw / 740); py = box[1] + int(231 * bh / 540)
    ms, ma, bx = icon_masks("visit", 120, px, py - 52)
    img = S.paint_icon(img, ms, ma, bx)
    return img

def fit(d, txt, px, maxw=860, sp=2):
    while px > 24:
        f = M(500, px)
        if sum(d.textlength(ch, font=f) + sp for ch in txt) <= maxw: return f
        px -= 2
    return M(500, 24)

def card_rows(img, y0, rows, h=190, big=None):
    if big:
        d = ImageDraw.Draw(img)
        cm.spaced(d, big[0], M(700, 100), CX, y0 + cap(100), NAVY + (255,), 4)
        cm.spaced(d, big[1], M(700, 28), CX, y0 + cap(100) + 66, RED + (255,), 7)
        y0 += cap(100) + 66 + 110
    for i, (ttl, sub) in enumerate(rows):
        if i or big:
            ln = Image.new("L", (W, H), 0); ImageDraw.Draw(ln).rectangle([CX - 200, y0 - 2, CX + 200, y0], fill=255)
            img = Image.alpha_composite(img, cm.gradient_fill(ln, CX - 200, CX + 200, NAVY, RED))
        d = ImageDraw.Draw(img)
        cm.spaced(d, ttl, M(700, 27), CX, y0 + int(h * 0.34), RED + (255,), 7)
        cm.spaced(d, sub, fit(d, sub, 46), CX, y0 + int(h * 0.70), NAVY + (255,), 2)
        y0 += h
    return img

def slide(n, seed, kicker, top, word, blocks, icon="visit", icon_big=None, post=None):
    img = st.story_bg(seed)
    img = logo_at(img, 165, 78)
    ms, ma, box = icon_masks(icon, 64, 540, 1838)
    img = S.paint_icon(img, ms, ma, box)
    fw, ft, gap, t_top, w_bot = title_layout(top, word, 175, 92)
    d = ImageDraw.Draw(img)
    y = 318
    cm.spaced(d, kicker, M(700, 25), CX, y + cap(25), tuple(int(v * 0.8) for v in RED) + (255,), 7)
    ty = y + cap(25) + 40
    img = S.draw_title(img, fw, ft, gap, top, word, int(ty - t_top))
    tb = ty + (w_bot - t_top); hl = tb + 46
    ln = Image.new("L", (W, H), 0); ImageDraw.Draw(ln).rectangle([CX - 260, hl, CX + 260, hl + 2], fill=255)
    img = Image.alpha_composite(img, cm.gradient_fill(ln, CX - 260, CX + 260, NAVY, RED))
    if post: img = post(img, hl)
    d = ImageDraw.Draw(img)
    def run(y, draw):
        for kind, a, b in blocks:
            if kind == "big":
                if draw: cm.spaced(d, a, M(700, 96), CX, y + cap(96), NAVY + (255,), 4)
                y += cap(96) + 26
                if b:
                    if draw: cm.spaced(d, b, M(500, 34), CX, y + cap(34), NAVY + (225,), 4)
                    y += cap(34)
                y += 110
            elif kind == "item":
                if draw: cm.spaced(d, a, M(700, 28), CX, y + cap(28), RED + (255,), 7)
                y += cap(28) + 26
                if draw: cm.spaced(d, b, M(500, 44), CX, y + cap(44), NAVY + (255,), 2)
                y += cap(44) + 96
            elif kind == "note":
                if draw: cm.spaced(d, a, M(500, 38), CX, y + cap(38), NAVY + (225,), 3)
                y += cap(38) + 30
            elif kind == "gap":
                y += a
            elif kind == "icon":
                y += 0
        return y
    h = run(0, False) - (60 if blocks and blocks[-1][0] == "item" else 0)
    ic_h = 0
    if icon_big:
        ic_h = 430
    area0, area1 = hl + 60, 1760
    y0 = area0 + (area1 - area0 - h - ic_h) / 2
    if icon_big:
        ms2, ma2, box2 = icon_masks(icon_big, 420, 540, y0 + 210)
        img = S.paint_icon(img, ms2, ma2, box2)
        d = ImageDraw.Draw(img)
        y0 += ic_h
    run(y0, True)
    y = y0 + h
    noise = Image.effect_noise((W, H), 46).convert("L")
    g = Image.merge("RGBA", (noise, noise, noise, Image.new("L", (W, H), 18)))
    res = Image.alpha_composite(img, g).convert("RGB"); res.save(f"{OUT}/visit-{n}.png"); print(n, y, flush=True)
    return res

def p1(img, hl):
    box = [100, hl + 60, 980, hl + 60 + 640]
    img = map_slot(img, box)
    d = ImageDraw.Draw(img)
    y = box[3] + 70
    cm.spaced(d, "AMERICAN SPACE OUJDA", M(700, 34), CX, y + cap(34), NAVY + (255,), 6); y += cap(34) + 40
    cm.spaced(d, "BOULEVARD MOHAMMED VI", M(500, 30), CX, y + cap(30), NAVY + (230,), 4); y += cap(30) + 18
    cm.spaced(d, "AND RUE DAKHLA", M(500, 30), CX, y + cap(30), NAVY + (230,), 4); y += cap(30) + 18
    cm.spaced(d, "OUJDA, MOROCCO", M(500, 30), CX, y + cap(30), NAVY + (230,), 4); y += cap(30) + 34
    cm.spaced(d, "05 36 50 67 57", M(700, 30), CX, y + cap(30), RED + (255,), 6)
    return img
def centred(rows, big=False, h=190):
    tot = len(rows) * h + (cap(100) + 66 + 110 if big else 0) - 60
    return lambda img, hl: card_rows(img, int((hl + 60 + 1760) / 2 - tot / 2), rows, h, BIG if big else None)
BIG = ("9 AM - 5 PM", "MONDAY TO FRIDAY")
GROUPS = [
 ("TO JOIN, BRING", ["Two photos", "A photocopy of your national ID"]),
 ("MEMBERS GET", ["Access to the library", "Computers and free Wi-Fi", "Books to borrow"]),
 ("CLUBS AND EVENTS", ["Free, no registration needed"]),
 ("ENGLISH CLASSES", ["Free for registered ASO members", "Registration happens in a set period", "See the English Classes highlight"]),
]
def p_join(img, hl):
    LH, HH, GG = 54, 62, 52
    tot = sum(HH + LH * len(ls) for _, ls in GROUPS) + GG * (len(GROUPS) - 1) - 20
    y = int((hl + 50 + 1780) / 2 - tot / 2)
    for i, (hd, ls) in enumerate(GROUPS):
        if i:
            ln = Image.new("L", (W, H), 0); ImageDraw.Draw(ln).rectangle([CX - 200, y - GG // 2, CX + 200, y - GG // 2 + 2], fill=255)
            img = Image.alpha_composite(img, cm.gradient_fill(ln, CX - 200, CX + 200, NAVY, RED))
        d = ImageDraw.Draw(img)
        cm.spaced(d, hd, M(700, 25), CX, y + cap(25), RED + (255,), 7); y += HH
        for t in ls:
            cm.spaced(d, t, fit(d, t, 38), CX, y + cap(38), NAVY + (255,), 2); y += LH
        y += GG
    return img
ims = [
 slide(1, 31, "AMERICAN SPACE OUJDA", "VISIT", "US", [], "visit", None, p1),
 slide(2, 23, "THE LIBRARY", "LIBRARY", "HOURS", [], "visit", None, centred([("CLOSED", "Saturday, Sunday and holidays"), ("CLUBS AND EVENTS", "Can run until 6 PM")], True)),
 slide(3, 47, "REGISTRATION", "JOIN THE", "SPACE", [], "visit", None, p_join),
]
tw, th, gp = 300, 533, 24
sheet = Image.new("RGB", (len(ims) * tw + (len(ims) + 1) * gp, th + 2 * gp), (22, 22, 22))
for i, s_ in enumerate(ims): sheet.paste(s_.resize((tw, th), Image.LANCZOS), (gp + i * (tw + gp), gp))
sheet.save(FINAL + "/visit-stories-sheet.png")
