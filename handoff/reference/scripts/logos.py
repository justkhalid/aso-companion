import sys; sys.path.insert(0, ".")
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter
import posters2 as P2
NAVY, RED = (14, 26, 74), (214, 34, 43)
def logo(lh=104):
    lg = Image.open("logo_clean.png").convert("RGBA"); lw = int(lh * lg.width / lg.height)
    return lg.resize((lw, lh), Image.LANCZOS)
def chip(img, x=48, y=48, lh=96, pad=15):
    lg = logo(lh); w, h = lg.width + 2 * pad, lg.height + 2 * pad
    base = img.convert("RGBA")
    m = Image.new("L", (w * 4, h * 4), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, w * 4 - 1, h * 4 - 1], radius=26 * 4, fill=255); m = m.resize((w, h), Image.LANCZOS)
    P = 40
    sh = Image.new("L", (w + 2 * P, h + 2 * P), 0); sh.paste(m, (P, P)); sh = sh.filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * 0.55))
    L = Image.new("RGBA", base.size, (0, 0, 0, 0)); L.paste((0, 0, 8, 255), (x - P, y + 8 - P), sh); base = Image.alpha_composite(base, L)
    pearl = Image.new("RGB", (w, h), (243, 239, 231)); arr = np.array(pearl).astype(np.float32)
    yy = np.linspace(0, 1, h)[:, None, None]; arr = arr * (1 - 0.05 * yy)   # soft vertical tone
    arr += np.random.default_rng(4).normal(0, 2.0, arr.shape)
    pearl = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    chipim = Image.new("RGBA", (w, h), (0, 0, 0, 0)); chipim.paste(pearl, (0, 0)); chipim.putalpha(m.point(lambda v: int(v * 0.96)))
    ring = Image.new("L", (w * 4, h * 4), 0); ImageDraw.Draw(ring).rounded_rectangle([0, 0, w * 4 - 1, h * 4 - 1], radius=26 * 4, outline=255, width=7); ring = ring.resize((w, h), Image.LANCZOS)
    ga = np.zeros((h, w, 3), np.float32); t = np.linspace(0, 1, w)[None, :, None]; ga[:] = np.array(NAVY) * (1 - t) + np.array(RED) * t
    chipim.paste(Image.fromarray(ga.astype(np.uint8)), (0, 0), ring.point(lambda v: int(v * 0.9)))
    base.alpha_composite(chipim, (x, y)); base.alpha_composite(lg, (x + pad, y + pad))
    return base.convert("RGB")
def mono(img, x=52, y=52, lh=104):
    lg = logo(lh); a = np.array(lg.getchannel("A")).astype(np.float32) / 255
    rgb = np.array(lg.convert("RGB")).astype(np.float32); lum = (rgb @ np.array([.299, .587, .114])) / 255
    ao = a * np.clip(1.45 - lum * 1.05, 0, 1) ** 0.75
    out = Image.new("RGBA", lg.size, (244, 240, 232, 0)); out.putalpha(Image.fromarray((ao * 255 * 0.95).astype(np.uint8)))
    base = img.convert("RGBA")
    P = 30; al = Image.new("L", (lg.width + 2 * P, lg.height + 2 * P), 0); al.paste(out.getchannel("A"), (P, P)); sh = al.filter(ImageFilter.GaussianBlur(5)).point(lambda v: int(v * 0.6))
    L = Image.new("RGBA", base.size, (0, 0, 0, 0)); L.paste((0, 0, 6, 255), (x - P, y + 3 - P), sh); base = Image.alpha_composite(base, L)
    base.alpha_composite(out, (x, y)); return base.convert("RGB")
def filled(img, x=52, y=52, lh=104):
    from scipy import ndimage as ndi
    lg = logo(lh)
    a = np.array(lg.getchannel("A")) > 40
    a = ndi.binary_closing(a, iterations=2); a = ndi.binary_fill_holes(a)
    m = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    base = img.convert("RGBA"); P = 30
    al = Image.new("L", (lg.width + 2 * P, lg.height + 2 * P), 0); al.paste(m, (P, P)); sh = al.filter(ImageFilter.GaussianBlur(6)).point(lambda v: int(v * 0.55))
    L = Image.new("RGBA", base.size, (0, 0, 0, 0)); L.paste((0, 0, 6, 255), (x - P, y + 4 - P), sh); base = Image.alpha_composite(base, L)
    body = Image.new("RGBA", lg.size, (246, 243, 236, 255)); body.putalpha(m)
    base.alpha_composite(body, (x, y)); base.alpha_composite(lg, (x, y)); return base.convert("RGB")
if __name__ == "__main__":
    import footerA as FA, posters as P0
    rows = []
    for name in ("discover-africa", "sports", "movie-discussion"):
        cl = cv2.imread(f"final/posters/clean-{name}.png")
        orig = P2.adaptive_logo
        P2.adaptive_logo = lambda im: (im, 0)
        P2.compose(name, cl, f"final/_nologo-{name}.png", footer=FA.foot_A2)
        P2.adaptive_logo = orig
        base = Image.open(f"final/_nologo-{name}.png")
        for k, fn in (("chip", chip), ("mono", mono)):
            fn(base).save(f"final/_logo-{name}-{k}.png")
    crops = []
    for name in ("discover-africa", "sports", "movie-discussion"):
        for k in ("chip", "mono"): crops.append(Image.open(f"final/_logo-{name}-{k}.png").crop((0, 0, 360, 300)))
    sh = Image.new("RGB", (2 * 360 + 30, 3 * 300 + 40), (22, 22, 22))
    for i, c in enumerate(crops): sh.paste(c, (10 + (i % 2) * 370, 10 + (i // 2) * 310))
    sh.save("final/logo-options.png"); print("ok")
