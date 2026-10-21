import sys
sys.path.insert(0, "/tmp/claude-0/-home-claude/d7047422-f1a0-5bb0-b041-a3f441efef6b/scratchpad")
import numpy as np
from PIL import Image, ImageChops, ImageFilter, ImageDraw
import covers_v2 as c2, covers_v3 as c3, cover_madrid as cm, stories as st
W, H, CX, F, NAVY, RED = st.W, st.H, st.CX, st.F, st.NAVY, st.RED
FINAL = st.FINAL
LOGO = st.LOGO


def bb(m):
    a = np.asarray(m) > 40
    ys = np.where(a.any(1))[0]; xs = np.where(a.any(0))[0]
    return int(xs[0]), int(ys[0]), int(xs[-1]), int(ys[-1])


def shift(m, dx, dy):
    return ImageChops.offset(m, int(round(dx)), int(round(dy)))


def line_mask(text, font, base, tracking, cx=540):
    m, _ = cm.text_mask(text, font, cx, base, tracking=tracking)
    x0, y0, x1, y1 = bb(m)
    dx = cx - (x0 + x1) / 2
    m, _ = cm.text_mask(text, font, cx + dx, base, tracking=tracking)
    return m


def title_layout(top, word, max_word, max_top):
    """Return fonts and relative geometry with baseline of word at 0."""
    fw = c2.fit_font(F + "/bodoni600i.ttf", word, 800, max_word, -6)
    gap = c2.cap_h(fw) + 46
    mw = line_mask(word, fw, 1000, -6)
    if not top:
        return fw, fw, gap, bb(mw)[1] - 1000, bb(mw)[3] - 1000
    ft = c2.fit_font(F + "/bodoni500i.ttf", top, 740, max_top, -2)
    mt = line_mask(top, ft, 1000 - gap, -2)
    t_top = bb(mt)[1] - 1000
    w_bot = bb(mw)[3] - 1000
    return fw, ft, gap, t_top, w_bot


def draw_title(img, fw, ft, gap, top, word, base):
    for text, font, b, tr in [(top, ft, base - gap, -2), (word, fw, base, -6)]:
        if not text: continue
        m = line_mask(text, font, b, tr)
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        sh.paste((40, 30, 60, 255), (0, 0), ImageChops.offset(m, 0, 12).filter(ImageFilter.GaussianBlur(16)).point(lambda v: int(v * 0.28)))
        img = Image.alpha_composite(img, sh)
        x0, _, x1, _ = bb(m)
        img = Image.alpha_composite(img, cm.gradient_fill(m, x0, x1, NAVY, RED))
    return img


def logo_at(img, cy, h):
    w = int(h * LOGO.width / LOGO.height)
    lg = LOGO.resize((w, h), Image.LANCZOS)
    x, y = CX - w // 2, int(round(cy - h / 2))
    P = 40
    pa = Image.new("L", (w + 2 * P, h + 2 * P), 0)
    pa.paste(lg.getchannel("A"), (P, P))
    a = pa.filter(ImageFilter.GaussianBlur(10)).point(lambda v: int(v * 0.16))
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sh.paste((40, 30, 60, 255), (x - P, y + 8 - P), a)
    img = Image.alpha_composite(img, sh)
    img.alpha_composite(lg, (x, y))
    return img


def icon_masks(key, size, cx, cy):
    s, a = c3.ICONS[key]
    ms, _, _ = c2.icon_mask(s, size=size, cy=540, sw=0.9)
    ma, _, _ = c2.icon_mask(a, size=size, cy=540, sw=0.9)
    x0, y0, x1, y1 = bb(ImageChops.lighter(ms, ma))
    dx, dy = cx - (x0 + x1) / 2, cy - (y0 + y1) / 2
    ms, ma = shift(ms, dx, dy), shift(ma, dx, dy)
    return ms, ma, bb(ImageChops.lighter(ms, ma))


def paint_icon(img, ms, ma, box):
    both = ImageChops.lighter(ms, ma)
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sh.paste((40, 30, 60, 255), (0, 0), ImageChops.offset(both, 0, 10).filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * 0.26)))
    img = Image.alpha_composite(img, sh)
    img = Image.alpha_composite(img, cm.gradient_fill(ms, box[0], box[2], NAVY, RED))
    acc = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    acc.paste(RED + (255,), (0, 0), ma)
    return Image.alpha_composite(img, acc)


PILL_GAP, PILL_H, ICON_GAP = 93, 74, 80


def story(key, top, word, icon, seed, out, logo_h=150):
    mw, mt = (285, 150) if not icon else (230, 120)
    fw, ft, gap, t_top, w_bot = title_layout(top, word, mw, mt)
    title_h = w_bot - t_top  # from top-line ink top to word ink bottom
    icon_h = 0
    if icon:
        _, _, box = icon_masks(icon, 340, 540, 540)
        icon_h = box[3] - box[1]
    group = (icon_h + ICON_GAP if icon else 0) + title_h + PILL_GAP + PILL_H
    g_top = 960 - group / 2
    img = st.story_bg(seed)
    if icon:
        icy = g_top + icon_h / 2
        ms, ma, box = icon_masks(icon, 340, 540, icy)
        img = paint_icon(img, ms, ma, box)
        t_ink_top = g_top + icon_h + ICON_GAP
    else:
        t_ink_top = g_top
    base = t_ink_top - t_top  # word baseline
    img = draw_title(img, fw, ft, gap, top, word, int(round(base)))
    y_pill = int(round(base + w_bot + PILL_GAP))
    img = logo_at(img, g_top / 2, logo_h)
    res = c2.finish(img, "light", "AMERICAN SPACE OUJDA", NAVY, RED, NAVY, y_pill=y_pill)
    res.save(out)
    return res, dict(group_top=g_top, pill_bottom=y_pill + PILL_H, logo_cy=g_top / 2)


def icon_cover(key, seed, out):
    ms, ma, box = icon_masks(key, 520, 540, 960)
    img = paint_icon(c2.frame("light", seed).convert("RGBA"), ms, ma, box)
    res = c3.grain(img)
    res.save(out)
    return res


def word_cover(seed, out, with_logo, logo_h=165, logo_gap=60):
    fw, ft, gap, t_top, w_bot = title_layout("THIS", "MONTH", 285, 150)
    title_h = w_bot - t_top
    lh = (logo_h + logo_gap) if with_logo else 0
    group = lh + title_h + PILL_GAP + PILL_H
    g_top = 960 - group / 2
    img = c2.frame("light", seed).convert("RGBA")
    if with_logo:
        img = logo_at(img, g_top + logo_h / 2, logo_h)
    t_ink_top = g_top + lh
    base = t_ink_top - t_top
    img = draw_title(img, fw, ft, gap, "THIS", "MONTH", int(round(base)))
    y_pill = int(round(base + w_bot + PILL_GAP))
    res = c2.finish(img, "light", "AMERICAN SPACE OUJDA", NAVY, RED, NAVY, y_pill=y_pill)
    res.save(out)
    return res


def profile():
    bg = c2.frame("light", 19).convert("RGBA").crop((0, 420, 1080, 1500))
    tmp = Image.new("RGBA", (1080, 1920), (0, 0, 0, 0)); tmp.paste(bg, (0, 420))
    full = logo_at(tmp, 960, 680)
    pp = full.crop((0, 420, 1080, 1500)).convert("RGBA")
    g = np.random.default_rng(4).normal(128, 46, (1080, 1080)).clip(0, 255).astype(np.uint8)
    gi = Image.fromarray(np.dstack([g, g, g, np.full((1080, 1080), 18, np.uint8)]), "RGBA")
    pp = Image.alpha_composite(pp, gi).convert("RGB")
    pp.save(FINAL + "/profile-picture-1080.png")
    pp.resize((320, 320), Image.LANCZOS).save(FINAL + "/profile-picture-320.png")
    m = Image.new("L", (1080, 1080), 0); ImageDraw.Draw(m).ellipse([0, 0, 1079, 1079], fill=255)
    circ = Image.new("RGB", (1080, 1080), (20, 20, 20)); circ.paste(pp, (0, 0), m)
    prev = Image.new("RGB", (700, 360), (20, 20, 20))
    prev.paste(circ.resize((320, 320), Image.LANCZOS), (20, 20)); prev.paste(circ.resize((110, 110), Image.LANCZOS), (380, 20))
    prev.save(FINAL + "/profile-preview.png")


if __name__ == "__main__":
    spec = [("this-month", "THIS", "MONTH", None, 11, "This Month"),
            ("links", "USEFUL", "LINKS", "links", 83, "Links"),
            ("clubs", "WEEKLY", "CLUBS", "clubs", 31, "Clubs"),
            ("events", "UPCOMING", "EVENTS", "events", 23, "Events"),
            ("classes", "ENGLISH", "CLASSES", "classes", 71, "English Classes"),
            ("visit", "PLAN YOUR", "VISIT", "visit", 47, "Visit"),
            ("recaps", "EVENT", "RECAPS", "recaps", 59, "Recaps")]
    covers, stories_, labels = [], [], []
    for i, (key, top, word, icon, seed, lab) in enumerate(spec, start=1):
        if key == "this-month":
            cv = word_cover(11, f"{FINAL}/covers/cover-1-this-month.png", False)
            word_cover(11, f"{FINAL}/covers/cover-1b-this-month-logo.png", True)
        else:
            cv = icon_cover(icon, seed, f"{FINAL}/covers/cover-{i}-{key}.png")
        s, info = story(key, top, word, icon, seed, f"{FINAL}/stories/story-{i}-{key}.png")
        print(key, {k: round(v) for k, v in info.items()}, flush=True)
        covers.append(cv); stories_.append(s); labels.append(lab)
    c2.strip(covers, labels, f"{FINAL}/covers-strip.png", d=290)
    tw, th, gp = 300, 533, 28
    sheet = Image.new("RGB", (len(stories_) * tw + (len(stories_) + 1) * gp, th + 2 * gp), (22, 22, 22))
    for i, s in enumerate(stories_):
        sheet.paste(s.resize((tw, th), Image.LANCZOS), (gp + i * (tw + gp), gp))
    sheet.save(f"{FINAL}/stories-sheet.png")
    profile()
    print("ok")
