import sys, os, shutil
sys.path.insert(0, "/tmp/claude-0/-home-claude/d7047422-f1a0-5bb0-b041-a3f441efef6b/scratchpad")
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import covers_v2 as c2
import covers_v3 as c3
import cover_madrid as cm

W, H, CX, CY, F, BASE = c2.W, c2.H, c2.CX, c2.CY, c2.F, c2.BASE
NAVY, RED = c2.NAVY, c2.RED
FINAL = BASE + "/final"
os.makedirs(FINAL + "/covers", exist_ok=True)
os.makedirs(FINAL + "/stories", exist_ok=True)

c3.ICONS["links"] = (
    """<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" fill="none"/>
<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" fill="none"/>""",
    """<circle cx="12" cy="12" r="1.35" fill="#000" stroke="none"/>""")

from scipy.ndimage import map_coordinates, zoom, gaussian_filter
import edge_fx


def corner_fields(Wd, Hd, seed, corners=(-45, 135)):
    """Madrid-style streaks confined to the top-right and bottom-left corners of any canvas."""
    w, h = Wd // 2, Hd // 2
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
    wgt = 0.02 + 0.98 * np.maximum.reduce([np.exp(-(ad(phi, np.deg2rad(c)) / 0.30) ** 2) for c in corners])
    I = gaussian_filter(tex * edge_fx._smooth(rn, 0.93, 1.36) * wgt * 0.8, 0.9)
    blobs = np.zeros((h, w), np.float32)
    blist = []
    for i, c in enumerate(corners):
        blist += [(c - 2, 1.0 - 0.1 * i, 34 + 4 * i, 5), (c + (14 if c < 0 else -14), 0.6, 20, 4)]
    for ang, amp, su, sv in blist:
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

    def up(a):
        return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).resize((Wd, Hd), Image.BICUBIC), dtype=np.float32) / 255

    return up(ch[0]), up(ch[1]), up(ch[2]), up(blobs), None


CORNERS = {11: (-45, 135), 83: (-135, 45), 31: (-20, 160), 23: (-60, 120), 71: (-150, 30), 47: (-45, 45), 59: (-135, 135)}


def story_bg(seed):
    bg = c2.bg_light()
    return edge_fx.apply_light(bg, corner_fields(W, H, seed, CORNERS.get(seed, (-45, 135)))).convert("RGBA")


LOGO = Image.open("/tmp/claude-0/-home-claude/d7047422-f1a0-5bb0-b041-a3f441efef6b/scratchpad/logo_clean.png").convert("RGBA")


def paste_logo(img, y=150, h=150):
    w = int(h * LOGO.width / LOGO.height)
    lg = LOGO.resize((w, h), Image.LANCZOS)
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    P = 40
    pa = Image.new("L", (w + 2 * P, h + 2 * P), 0)
    pa.paste(lg.getchannel("A"), (P, P))
    a = pa.filter(ImageFilter.GaussianBlur(10)).point(lambda v: int(v * 0.16))
    sh.paste((40, 30, 60, 255), (CX - w // 2 - P, y + 8 - P), a)
    img = Image.alpha_composite(img, sh)
    img.alpha_composite(lg, (CX - w // 2, y))
    return img


def title_block(img, top, word, base_y, max_word, max_top):
    f_word = c2.fit_font(F + "/bodoni600i.ttf", word, 800, max_word, -6)
    top_base = base_y - c2.cap_h(f_word) - 46
    f_top = c2.fit_font(F + "/bodoni500i.ttf", top, 740, max_top, -2)
    m_top, w_top = cm.text_mask(top, f_top, CX, top_base, tracking=-2)
    m_word, w_word = cm.text_mask(word, f_word, CX, base_y, tracking=-6)
    for m, wd in [(m_top, w_top), (m_word, w_word)]:
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        sh.paste((40, 30, 60, 255), (0, 0), ImageChops.offset(m, 0, 12).filter(ImageFilter.GaussianBlur(16)).point(lambda v: int(v * 0.28)))
        img = Image.alpha_composite(img, sh)
        x0 = CX - wd / 2
        img = Image.alpha_composite(img, cm.gradient_fill(m, x0, x0 + wd, NAVY, RED))
    return img


def story(key, top, word, icon, seed, out):
    img = story_bg(seed)
    img = paste_logo(img)
    if icon:
        stroke, accent = c3.ICONS[icon]
        m_s, xa, xb = c2.icon_mask(stroke, size=340, cy=690, sw=0.9)
        m_a, _, _ = c2.icon_mask(accent, size=340, cy=690, sw=0.9)
        both = ImageChops.lighter(m_s, m_a)
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        sh.paste((40, 30, 60, 255), (0, 0), ImageChops.offset(both, 0, 10).filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * 0.26)))
        img = Image.alpha_composite(img, sh)
        img = Image.alpha_composite(img, cm.gradient_fill(m_s, xa, xb, NAVY, RED))
        acc = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        acc.paste(RED + (255,), (0, 0), m_a)
        img = Image.alpha_composite(img, acc)
        img = title_block(img, top, word, 1230, 230, 120)
        y_pill = 1325
    else:
        img = title_block(img, top, word, 1075, 285, 150)
        y_pill = 1170
    res = c2.finish(img, "light", "AMERICAN SPACE OUJDA", NAVY, RED, NAVY, y_pill=y_pill)
    res.save(out)
    return res


if __name__ == "__main__":
    spec = [("this-month", "THIS", "MONTH", None, 11, "This Month"),
            ("links", "USEFUL", "LINKS", "links", 83, "Links"),
            ("clubs", "WEEKLY", "CLUBS", "clubs", 31, "Clubs"),
            ("events", "UPCOMING", "EVENTS", "events", 23, "Events"),
            ("classes", "ENGLISH", "CLASSES", "classes", 71, "English Classes"),
            ("visit", "PLAN YOUR", "VISIT", "visit", 47, "Visit"),
            ("recaps", "EVENT", "RECAPS", "recaps", 59, "Recaps")]
    covers, stories, labels = [], [], []
    old = BASE + "/covers_v3"
    for i, (key, top, word, icon, seed, lab) in enumerate(spec, start=1):
        # cover
        if key == "this-month":
            cv = Image.open(old + "/1-this-month.png").convert("RGB")
        elif key == "links":
            cv = c3.icon_only("links", seed, "tmp-links")
        else:
            idx = {"clubs": 2, "events": 3, "classes": 4, "visit": 5, "recaps": 6}[key]
            fname = {"clubs": "2-clubs", "events": "3-events", "classes": "4-classes", "visit": "5-visit", "recaps": "6-recaps"}[key]
            cv = Image.open(f"{old}/{fname}.png").convert("RGB")
        cv.save(f"{FINAL}/covers/cover-{i}-{key}.png")
        covers.append(cv)
        st = story(key, top, word, icon, seed, f"{FINAL}/stories/story-{i}-{key}.png")
        stories.append(st)
        labels.append(lab)
        print(key, flush=True)
    c2.strip(covers, labels, f"{FINAL}/covers-strip.png", d=290)
    # contact sheet of the story slides
    tw, th = 300, 533
    gap = 28
    sheet = Image.new("RGB", (len(stories) * tw + (len(stories) + 1) * gap, th + 2 * gap), (22, 22, 22))
    for i, s in enumerate(stories):
        sheet.paste(s.resize((tw, th), Image.LANCZOS), (gap + i * (tw + gap), gap))
    sheet.save(f"{FINAL}/stories-sheet.png")
    print("done")
