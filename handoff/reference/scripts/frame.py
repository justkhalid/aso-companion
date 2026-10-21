import sys, os
sys.path.insert(0, "/tmp/claude-0/-home-claude/d7047422-f1a0-5bb0-b041-a3f441efef6b/scratchpad")
import numpy as np
from scipy.ndimage import map_coordinates, zoom, gaussian_filter
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

BASE = "/tmp/claude-0/-home-claude/d7047422-f1a0-5bb0-b041-a3f441efef6b"
BASE += "/scratchpad"
F = BASE + "/fonts"
OUT = BASE + "/frame"
os.makedirs(OUT, exist_ok=True)

W0, H0, S = 1080, 1440, 2
W, H = W0 * S, H0 * S
NAVY = (14, 26, 74)
RED = (214, 34, 43)
CORAL = (255, 106, 90)
CREAM = (244, 239, 230)
MARGIN = 56
BAND_TOP = H0 - 112


def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def up(a, size):
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).resize(size, Image.BICUBIC), dtype=np.float32) / 255


SHADE = True
def streak_layer(seed, flip):
    w, h = 540, 720
    cx, cy = w / 2, h / 2
    rng = np.random.default_rng(seed)
    low = rng.standard_normal((9, 6)).astype(np.float32)
    pert = zoom(low, (h / 9, w / 6), order=3)
    pert = np.pad(pert, ((0, max(0, h - pert.shape[0])), (0, max(0, w - pert.shape[1]))), mode="edge")[:h, :w] * 0.2
    fine = rng.random((h, w)).astype(np.float32)
    coarse = gaussian_filter(rng.random((h, w)).astype(np.float32), 2.6)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)

    def tang(px, py):
        nx, ny = (px - cx) / (w / 2), (py - cy) / (h / 2)
        return np.arctan2(nx * (h / 2), -ny * (w / 2)) + map_coordinates(pert, [py, px], order=1, mode="nearest")

    def lic(noise, L=40, step=2.0):
        acc, cnt = noise.copy(), 1
        for sign in (1, -1):
            px, py = xx.copy(), yy.copy()
            for _ in range(L):
                a = tang(px, py)
                px = px + sign * np.cos(a) * step
                py = py + sign * np.sin(a) * step
                acc += map_coordinates(noise, [py, px], order=1, mode="reflect")
                cnt += 1
        return acc / cnt

    f, c = lic(fine), lic(coarse)
    f = (f - f.mean()) / (f.std() + 1e-6)
    c = (c - c.mean()) / (c.std() + 1e-6)
    tex = np.clip(0.46 + 0.30 * f + 0.48 * c, 0, 1) ** 3.0

    nx, ny = (xx - cx) / (w / 2), (yy - cy) / (h / 2)
    rn, phi = np.hypot(nx, ny), np.arctan2(ny, nx)
    ad = lambda a, b: (a - b + np.pi) % (2 * np.pi) - np.pi
    wgt = (0.03 if SHADE else 0.0) + (0.97 if SHADE else 1.0) * np.maximum(np.exp(-(ad(phi, np.deg2rad(-45)) / 0.33) ** 2), np.exp(-(ad(phi, np.deg2rad(135)) / 0.33) ** 2))
    I = tex * smooth(rn, 0.93, 1.36) * wgt * 0.66
    I = gaussian_filter(I, 0.9)

    blobs = np.zeros((h, w), np.float32)
    for ang, amp, su, sv in [(-47, 1.0, 34, 5), (-33, 0.6, 20, 4), (137, 0.9, 38, 5)]:
        a = np.deg2rad(ang)
        bnx, bny = np.cos(a) * 1.12, np.sin(a) * 1.12
        bx, by = cx + bnx * (w / 2), cy + bny * (h / 2)
        tx, ty = -bny * (w / 2), bnx * (h / 2)
        n = np.hypot(tx, ty)
        tx, ty = tx / n, ty / n
        u = (xx - bx) * tx + (yy - by) * ty
        v = -(xx - bx) * ty + (yy - by) * tx
        blobs += amp * np.exp(-(u / su) ** 2 - (v / sv) ** 2)
    I = np.clip(I + 0.85 * np.clip(blobs, 0, 1), 0, 1)

    rx, ry = nx * (w / 2), ny * (h / 2)
    rl = np.hypot(rx, ry) + 1e-6
    rx, ry = rx / rl, ry / rl
    ch = [map_coordinates(I, [yy + ry * s, xx + rx * s], order=1, mode="nearest") for s in (1.6, 0.0, -1.6)]
    if flip:
        ch = [np.fliplr(a) for a in ch]
    ch = [up(a, (W, H)) for a in ch]
    amax = np.clip(np.maximum.reduce(ch) * 0.95, 0, 1)
    tint = (0.72, 0.82, 1.0)
    rgb = np.stack([np.clip(tint[i] * 255 * (ch[i] / (amax + 1e-4)), 0, 255) for i in range(3)], -1).astype(np.uint8)
    streak = Image.fromarray(np.dstack([rgb, (amax * 255).astype(np.uint8)]), "RGBA")

    # soft navy corner shading so the streaks read on light posters too
    yy2, xx2 = np.mgrid[0:H0, 0:W0].astype(np.float32)
    corners = [(W0, 0), (0, H0)] if not flip else [(0, 0), (W0, H0)]
    al = np.zeros((H0, W0), np.float32)
    for (kx, ky) in corners:
        d = np.hypot(xx2 - kx, yy2 - ky) / 360.0
        al = np.maximum(al, 0.50 * np.clip(1 - d, 0, 1) ** 1.8)
    al = up(al, (W, H))
    patch = np.zeros((H, W, 4), np.uint8)
    patch[..., 0], patch[..., 1], patch[..., 2] = 8, 14, 44
    patch[..., 3] = (al * 255).astype(np.uint8)
    if not SHADE: return streak
    return Image.alpha_composite(Image.fromarray(patch, "RGBA"), streak)


def hgrad(mask, x0, x1, c0, c1, alpha=1.0):
    xs = np.clip((np.arange(W) - x0) / max(1, x1 - x0), 0, 1)
    arr = np.zeros((H, W, 4), np.uint8)
    for i in range(3):
        arr[..., i] = (c0[i] * (1 - xs) + c1[i] * xs)[None, :].astype(np.uint8)
    arr[..., 3] = int(255 * alpha)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.paste(Image.fromarray(arr, "RGBA"), (0, 0), mask)
    return out


def sp_width(d, text, font, spacing):
    return sum(d.textlength(ch, font=font) for ch in text) + spacing * (len(text) - 1)


def sp_draw(d, x, y, text, font, fill, spacing):
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill, anchor="ls")
        x += d.textlength(ch, font=font) + spacing


def footer(img, variant):
    y0 = BAND_TOP
    pts = [(0, H0), (0, y0)]
    x = 8
    while x + 40 <= W0:
        pts += [(x, y0), (x, y0 - 5), (x + 8, y0 - 5), (x + 8, y0 - 9), (x + 16, y0 - 9), (x + 16, y0 - 13),
                (x + 24, y0 - 13), (x + 24, y0 - 9), (x + 32, y0 - 9), (x + 32, y0 - 5), (x + 40, y0 - 5), (x + 40, y0)]
        x += 56
    pts += [(W0, y0), (W0, H0)]
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).polygon([(px * S, py * S) for px, py in pts], fill=255)
    top, bot = (16, 28, 82), (6, 11, 34)
    ys = np.clip((np.arange(H) - (y0 - 14) * S) / ((H0 - (y0 - 14)) * S), 0, 1)
    arr = np.zeros((H, W, 4), np.uint8)
    for i in range(3):
        arr[..., i] = (top[i] * (1 - ys) + bot[i] * ys)[:, None].astype(np.uint8)
    arr[..., 3] = 245
    band = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    band.paste(Image.fromarray(arr, "RGBA"), (0, 0), mask)
    img = Image.alpha_composite(img, band)
    # gradient hairline at the base of the battlements
    line = Image.new("L", (W, H), 0)
    ImageDraw.Draw(line).rectangle([0, y0 * S, W, (y0 + 3) * S], fill=255)
    img = Image.alpha_composite(img, hgrad(line, 0, W, (255, 255, 255), CORAL, 0.9))

    d = ImageDraw.Draw(img)
    base_y = (H0 - 40) * S
    f_name = ImageFont.truetype(F + "/manrope700.ttf", 21 * S)
    f_hand = ImageFont.truetype(F + "/manrope500.ttf", 22 * S)
    handle = "@americanspaceoujda"
    if variant == "left":
        sp_draw(d, MARGIN * S, base_y, "AMERICAN SPACE OUJDA", f_name, CREAM + (255,), 5 * S)
        wh = sp_width(d, handle, f_hand, 1 * S)
        sp_draw(d, W - MARGIN * S - wh, base_y, handle, f_hand, CREAM + (235,), 1 * S)
    else:
        f_ar = ImageFont.truetype(F + "/cairo700.ttf", 30 * S, layout_engine=ImageFont.Layout.RAQM)
        d.text((W - MARGIN * S, base_y + 2 * S), "الفضاء الأمريكي بوجدة", font=f_ar, fill=CREAM + (255,), anchor="rs", language="ar")
        sp_draw(d, MARGIN * S, base_y, handle, f_hand, CREAM + (235,), 1 * S)
    return img


def logo_badge(img, variant):
    logo = Image.open("/mnt/user-data/uploads/Untitled_design.png").convert("RGBA").crop((56, 4, 437, 492))
    bw, bh = 160, 196
    bx = MARGIN if variant == "left" else W0 - MARGIN - bw
    by = MARGIN
    rect = [bx * S, by * S, (bx + bw) * S, (by + bh) * S]
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([rect[0], rect[1] + 10 * S, rect[2], rect[3] + 10 * S], radius=36 * S, fill=(10, 16, 40, 120))
    img = Image.alpha_composite(img, shadow.filter(ImageFilter.GaussianBlur(14 * S)))
    badge = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(badge).rounded_rectangle(rect, radius=34 * S, fill=(252, 250, 246, 242))
    img = Image.alpha_composite(img, badge)
    ring = Image.new("L", (W, H), 0)
    ImageDraw.Draw(ring).rounded_rectangle(rect, radius=34 * S, outline=255, width=3 * S)
    img = Image.alpha_composite(img, hgrad(ring, rect[0], rect[2], NAVY, RED, 1.0))
    ph = (bh - 28) * S
    pw = int(ph * logo.width / logo.height)
    lg = logo.resize((pw, ph), Image.LANCZOS)
    img.alpha_composite(lg, (int(rect[0] + (bw * S - pw) / 2), int(rect[1] + 14 * S)))
    return img


def build(variant):
    img = streak_layer(seed=5 if variant == "left" else 9, flip=(variant == "right"))
    img = footer(img, variant)
    img = logo_badge(img, variant)
    big = f"{OUT}/ASO-frame-{variant}-2160x2880.png"
    img.save(big)
    small = img.resize((W0, H0), Image.LANCZOS)
    small.save(f"{OUT}/ASO-frame-{variant}-1080x1440.png")
    return small


def guide():
    bg = Image.new("RGB", (W0, H0), (238, 234, 226))
    d = ImageDraw.Draw(bg, "RGBA")
    f = ImageFont.truetype(F + "/manrope700.ttf", 26)
    f2 = ImageFont.truetype(F + "/manrope500.ttf", 24)
    d.rectangle([MARGIN, MARGIN, W0 - MARGIN, BAND_TOP - 28], outline=(14, 26, 74, 255), width=3)
    d.rectangle([MARGIN, MARGIN, MARGIN + 160, MARGIN + 196], fill=(214, 34, 43, 60), outline=(214, 34, 43, 255), width=3)
    d.rectangle([W0 - MARGIN - 160, MARGIN, W0 - MARGIN, MARGIN + 196], fill=(214, 34, 43, 40), outline=(214, 34, 43, 200), width=2)
    d.text((MARGIN + 80, MARGIN + 98), "LOGO", font=f, fill=(140, 20, 28, 255), anchor="mm")
    d.text((W0 - MARGIN - 80, MARGIN + 98), "LOGO\n(AR)", font=f, fill=(140, 20, 28, 255), anchor="mm", align="center")
    d.rectangle([0, BAND_TOP - 14, W0, H0], fill=(14, 26, 74, 70))
    d.text((W0 // 2, BAND_TOP + 56), "FOOTER BAND. Nothing important below this line.", font=f, fill=(14, 26, 74, 255), anchor="mm")
    d.text((W0 // 2, 700), "SAFE AREA", font=ImageFont.truetype(F + "/bodoni600i.ttf", 120), fill=(14, 26, 74, 90), anchor="mm")
    d.text((W0 // 2, 790), "Keep text and key faces inside the outlined box.\nBackground art can bleed to every edge.", font=f2, fill=(14, 26, 74, 220), anchor="mm", align="center")
    d.text((MARGIN + 180, MARGIN + 150), "Logo corner: keep it clear", font=f2, fill=(140, 20, 28, 255), anchor="lm")
    bg.save(f"{OUT}/ASO-frame-safe-area-guide.png")


def demo(left, right):
    shot = Image.open("/mnt/user-data/uploads/1792528535817_image.png").convert("RGB")
    k = shot.width / 1638.0
    tiles = [("Public Speaking", (1301, 583, 1542, 906), left),
             ("Discover Africa", (85, 907, 325, 1230), left),
             ("Movie Discussion", (85, 583, 325, 906), left),
             ("Arabic course", (1057, 583, 1299, 906), right)]
    pw, ph = 420, 560
    gap = 28
    sheet = Image.new("RGB", (len(tiles) * pw + (len(tiles) + 1) * gap, ph + 2 * gap + 44), (22, 22, 22))
    f = ImageFont.truetype(F + "/manrope700.ttf", 22)
    for i, (name, box, fr) in enumerate(tiles):
        t = shot.crop(tuple(int(v * k) for v in box)).resize((W0, H0), Image.LANCZOS).convert("RGBA")
        t = Image.alpha_composite(t, fr).convert("RGB").resize((pw, ph), Image.LANCZOS)
        sheet.paste(t, (gap + i * (pw + gap), gap))
        ImageDraw.Draw(sheet).text((gap + i * (pw + gap) + pw // 2, gap + ph + 24), name, font=f, fill=CREAM, anchor="mm")
    sheet.save(f"{OUT}/demo-on-real-posters.png")


if __name__ == "__main__":
    left = build("left")
    print("left ok", flush=True)
    right = build("right")
    print("right ok", flush=True)
    guide()
    demo(left, right)
    print("done")
