import sys, cv2, numpy as np
sys.argv_backup = sys.argv
from PIL import Image, ImageFilter, ImageDraw, ImageFont
import frame as fr
import posters as P0
F = fr.F
W, H = 1080, 1440
INK = (7, 12, 38); CREAM = (244, 240, 232)
VARS = {  # seed, flip, gain_top, gain_bottom
 "psychology": (5, False, 1.0, 1.0), "movie-discussion": (21, True, 1.0, 0.45), "sports": (33, False, 0.55, 1.0),
 "philo-physics": (47, True, 1.0, 1.0), "discover-africa": (58, False, 1.0, 0.30), "public-speaking": (71, True, 0.5, 1.0)}
_cache = {}
DARKEXT = True
def frame_layer(name):
    if name in _cache: return _cache[name]
    seed, flip, gt, gb = VARS[name]
    layer = fr.streak_layer(seed=seed, flip=flip).convert("RGBA")
    a = np.array(layer.getchannel("A")).astype(np.float32)
    h = a.shape[0]; y = np.linspace(0, 1, h)[:, None]
    t = fr.smooth(y, 0.35, 0.65)
    a = a * (gt * (1 - t) + gb * t)
    layer.putalpha(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)))
    yy, xx = np.mgrid[0:1440, 0:1080].astype(np.float32)
    nx, ny = (xx - 540) / 540, (yy - 720) / 720
    v = 0.30 * fr.smooth(np.hypot(nx, ny), 0.78, 1.42)
    navy = np.zeros((1440, 1080, 4), np.uint8); navy[..., :3] = INK; navy[..., 3] = (v * 255).astype(np.uint8)
    lay = layer.resize((1080, 1440), Image.LANCZOS)
    out = lay
    _cache[name] = out; return out

def spaced(d, x, y, text, font, fill, sp, anchor="l"):
    w = sum(d.textlength(c, font=font) + sp for c in text) - sp
    if anchor == "r": x -= w
    for c in text:
        d.text((x, y), c, font=font, fill=fill, anchor="ls"); x += d.textlength(c, font=font) + sp

def glass_footer(img):
    x0, y0, x1, y1 = 56, 1370, 1024, 1422
    box = (x0, y0, x1, y1)
    bd = img.crop((x0 - 30, y0 - 30, x1 + 30, y1 + 30)).filter(ImageFilter.GaussianBlur(16)).crop((30, 30, 30 + x1 - x0, 30 + y1 - y0))
    tint = Image.new("RGB", bd.size, INK); bd = Image.blend(bd, tint, 0.58)
    m = Image.new("L", (bd.width * 3, bd.height * 3), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, m.width - 1, m.height - 1], radius=26 * 3, fill=255)
    m = m.resize(bd.size, Image.LANCZOS)
    img.paste(bd, (x0, y0), m)
    ring = Image.new("L", (bd.width * 3, bd.height * 3), 0); ImageDraw.Draw(ring).rounded_rectangle([0, 0, ring.width - 1, ring.height - 1], radius=26 * 3, outline=255, width=5)
    ring = ring.resize(bd.size, Image.LANCZOS)
    grad = Image.new("RGB", bd.size)
    ga = np.zeros((bd.height, bd.width, 3), np.float32); t = np.linspace(0, 1, bd.width)[None, :, None]
    ga[:] = np.array([244, 240, 232]) * (1 - t) + np.array([255, 120, 110]) * t
    img.paste(Image.fromarray(ga.astype(np.uint8)), (x0, y0), ring.point(lambda v: int(v * 0.85)))
    d = ImageDraw.Draw(img)
    fa = ImageFont.truetype(F + "/manrope700.ttf", 18); fb = ImageFont.truetype(F + "/manrope500.ttf", 19)
    base = y0 + 33
    spaced(d, x0 + 34, base, "AMERICAN SPACE OUJDA", fa, CREAM + (255,), 5)
    spaced(d, x1 - 34, base, "@americanspaceoujda", fb, CREAM + (235,), 1, anchor="r")
    return img

def adaptive_logo(img):
    import logos
    logo = Image.open("logo_clean.png").convert("RGBA")
    lh = 104; lw = int(lh * logo.width / logo.height); lg = logo.resize((lw, lh), Image.LANCZOS)
    x, y = 52, 52
    reg = np.array(img.crop((x - 10, y - 10, x + lw + 10, y + lh + 10)).convert("L")).astype(np.float32)
    lum = float(reg.mean())
    if lum < 125:
        return logos.filled(img, x, y, lh), lum
    Pd = 50
    al = Image.new("L", (lw + 2 * Pd, lh + 2 * Pd), 0); al.paste(lg.getchannel("A"), (Pd, Pd))
    base = img.convert("RGBA")
    sh = al.filter(ImageFilter.GaussianBlur(7)).point(lambda v: int(v * 0.22))
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0)); layer.paste((30, 24, 50, 255), (x - Pd, y + 4 - Pd), sh)
    base = Image.alpha_composite(base, layer)
    lg2 = lg.copy(); lg2.putalpha(lg2.getchannel("A").point(lambda v: int(v * 0.92)))
    base.alpha_composite(lg2, (x, y))
    return base.convert("RGB"), lum

def compose(name, cleaned, out, footer=None):
    im = Image.fromarray(cv2.cvtColor(cleaned, cv2.COLOR_BGR2RGB))
    top, h = 8, 1348
    h = min(h, round(1080 * im.height / im.width)); w = round(im.width * h / im.height)
    im = im.resize((w, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 60, 2))
    can = Image.new("RGB", (W, H)); x = (W - w) // 2
    can.paste(im, (x, top))
    dark = name in ("movie-discussion", "sports") and DARKEXT
    def ext(col, n, left=False):
        a = np.repeat(np.array(col).astype(np.float32), n, axis=1)
        if dark:
            t = np.linspace(0.08, 0.45, n)[None, :, None]
            if left: t = t[:, ::-1]
            a = a * (1 - t) + np.array(INK, np.float32) * t
        return Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.GaussianBlur(14))
    if x > 3:
        can.paste(ext(im.crop((0, 0, 3, h)).resize((1, h), Image.BOX), x, True), (0, top))
        can.paste(ext(im.crop((w - 3, 0, w, h)).resize((1, h), Image.BOX), W - x - w), (x + w, top))
        seam = 60
        for sx in (x, x + w):
            bx = (sx - seam, top, sx + seam, top + h)
            reg = can.crop(bx).filter(ImageFilter.GaussianBlur(12))
            ramp = np.concatenate([np.linspace(0, 1, seam), np.linspace(1, 0, seam)]).astype(np.float32)
            can.paste(reg, bx[:2], Image.fromarray((np.tile(ramp, (h, 1)) * 255).astype(np.uint8)))
    can.paste(can.crop((0, top, W, top + 1)).resize((W, top)), (0, 0))
    bot = top + h
    can.paste(can.crop((0, bot - 1, W, bot)).resize((W, H - bot)), (0, bot))
    bb = (0, bot - 50, W, bot + 50)
    reg = can.crop(bb).filter(ImageFilter.GaussianBlur(10))
    ramp = np.concatenate([np.linspace(0, 1, 50), np.linspace(1, 0, 50)]).astype(np.float32)
    can.paste(reg, bb[:2], Image.fromarray((np.tile(ramp[:, None], (1, W)) * 255).astype(np.uint8)))
    res = Image.alpha_composite(can.convert("RGBA"), frame_layer(name)).convert("RGB")
    res = (footer or glass_footer)(res)
    res, lum = adaptive_logo(res)
    res.save(out); return lum

if __name__ == "__main__":
    import os; os.makedirs("final/posters-v2", exist_ok=True)
    only = [a for a in sys.argv[1:]]
    for name, f, fn in P0.JOBS:
        if only and name not in only: continue
        cl = cv2.imread(f"final/posters/clean-{name}.png")
        lum = compose(name, cl, f"final/posters-v2/poster-{name}.png"); print(name, round(lum), flush=True)
