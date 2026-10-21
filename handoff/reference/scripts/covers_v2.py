import sys, os, io
sys.path.insert(0, "/tmp/claude-0/-home-claude/d7047422-f1a0-5bb0-b041-a3f441efef6b/scratchpad")
import numpy as np
import cairosvg
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import cover_madrid as cm
import edge_fx

W, H, CX, CY, F, BASE = cm.W, cm.H, cm.CX, cm.CY, cm.F, cm.BASE
OUT = BASE + "/covers_v2"
os.makedirs(OUT, exist_ok=True)

NAVY = (14, 26, 74)
RED = (214, 34, 43)
CORAL = (255, 106, 90)
CREAM = (244, 239, 230)
WHITE = (255, 255, 255)


def bg_dark():
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - CX) / 760) ** 2 + ((yy - CY) / 1100) ** 2)
    t = np.clip(d, 0, 1)
    c0, c1 = np.array([22, 38, 110]), np.array([5, 9, 26])
    img = (c0[None, None, :] * (1 - t[..., None]) + c1[None, None, :] * t[..., None]).astype(np.uint8)
    base = Image.fromarray(img, "RGB").convert("RGBA")
    base = Image.alpha_composite(base, cm.radial(820, 520, 520, (120, 150, 255), 0.45, 2.2))
    base = Image.alpha_composite(base, cm.radial(240, 1380, 520, (200, 40, 50), 0.26, 2.0))
    return base.convert("RGB")


def bg_light():
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - CX) / 780) ** 2 + ((yy - CY) / 1150) ** 2)
    t = np.clip(d, 0, 1) ** 1.4
    c0, c1 = np.array([253, 252, 249]), np.array([226, 220, 209])
    img = (c0[None, None, :] * (1 - t[..., None]) + c1[None, None, :] * t[..., None]).astype(np.uint8)
    base = Image.fromarray(img, "RGB").convert("RGBA")
    base = Image.alpha_composite(base, cm.radial(840, 500, 560, (170, 196, 255), 0.35, 2.2))
    base = Image.alpha_composite(base, cm.radial(240, 1400, 520, (255, 150, 130), 0.22, 2.0))
    return base.convert("RGB")


def cap_h(font):
    return -font.getbbox("H", anchor="ls")[1]


def fit_font(path, text, max_w, max_size, tracking):
    size = max_size
    while size > 40:
        f = ImageFont.truetype(path, size)
        d = ImageDraw.Draw(Image.new("L", (10, 10)))
        total = sum(d.textlength(c, font=f) for c in text) + tracking * (len(text) - 1)
        if total <= max_w:
            return f
        size -= 4
    return f


def frame(theme, seed):
    bg = bg_dark() if theme == "dark" else bg_light()
    fields = edge_fx.build_fields(seed=seed)
    img = edge_fx.apply_dark(bg, fields) if theme == "dark" else edge_fx.apply_light(bg, fields)
    return img.convert("RGBA")


def finish(img, theme, pill_text, c_left, c_right, ink, y_pill=1170):
    pw, ph = 560, 74
    px0, py0 = CX - pw // 2, y_pill
    ring = Image.new("L", (W, H), 0)
    ImageDraw.Draw(ring).rounded_rectangle([px0, py0, px0 + pw, py0 + ph], radius=ph // 2, outline=255, width=3)
    img = Image.alpha_composite(img, cm.gradient_fill(ring, px0, px0 + pw, c_left, c_right))
    f_label = ImageFont.truetype(F + "/manrope700.ttf", 27)
    cm.spaced(ImageDraw.Draw(img), pill_text, f_label, CX, py0 + ph // 2 + 10, ink + (255,), 5)
    noise = Image.effect_noise((W, H), 46).convert("L")
    a = 26 if theme == "dark" else 18
    grain = Image.merge("RGBA", (noise, noise, noise, Image.new("L", (W, H), a)))
    return Image.alpha_composite(img, grain).convert("RGB")


def word_cover(theme, top, word, seed, out_name, pill="AMERICAN SPACE OUJDA"):
    img = frame(theme, seed)
    c_left, c_right, ink = ((WHITE, CORAL, CREAM) if theme == "dark" else (NAVY, RED, NAVY))
    f_word = fit_font(F + "/bodoni600i.ttf", word, 800, 285, -6)
    base_y = 1075
    top_base = base_y - cap_h(f_word) - 46
    f_top = fit_font(F + "/bodoni500i.ttf", top, 740, 150, -2)
    m_top, w_top = cm.text_mask(top, f_top, CX, top_base, tracking=-2)
    m_word, w_word = cm.text_mask(word, f_word, CX, base_y, tracking=-6)
    for m, wd in [(m_top, w_top), (m_word, w_word)]:
        if theme == "dark":
            glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            glow.paste((255, 190, 170, 255), (0, 0), m.filter(ImageFilter.GaussianBlur(26)).point(lambda v: int(v * 0.35)))
            img = Image.alpha_composite(img, glow)
            sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            sh.paste((0, 0, 8, 255), (0, 0), ImageChops.offset(m, 0, 10).filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * 0.7)))
        else:
            sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            sh.paste((40, 30, 60, 255), (0, 0), ImageChops.offset(m, 0, 12).filter(ImageFilter.GaussianBlur(16)).point(lambda v: int(v * 0.28)))
        img = Image.alpha_composite(img, sh)
        x0 = CX - wd / 2
        img = Image.alpha_composite(img, cm.gradient_fill(m, x0, x0 + wd, c_left, c_right))
    out = finish(img, theme, pill, c_left, c_right, ink)
    out.save(f"{OUT}/{out_name}.png")
    return out


# ---- icon version -------------------------------------------------------
CAL_STROKE = """
<rect x="3.5" y="5" width="17" height="15.5" rx="2.2" fill="none"/>
<path d="M3.5 10H20.5M8 3V6.5M16 3V6.5" fill="none"/>
<circle cx="8" cy="14" r="0.85" fill="#000" stroke="none"/>
<circle cx="16" cy="14" r="0.85" fill="#000" stroke="none"/>
<circle cx="8" cy="17.3" r="0.85" fill="#000" stroke="none"/>
<circle cx="12" cy="17.3" r="0.85" fill="#000" stroke="none"/>
"""
CAL_ACCENT = '<circle cx="12" cy="14" r="1.6" fill="#000" stroke="none"/>'


def icon_mask(inner, size=520, cy=850, sw=0.95):
    s = size / 24.0
    x0, y0 = CX - size / 2, cy - size / 2
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
    <g transform="translate({x0} {y0}) scale({s})" stroke="#000" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{inner}</g></svg>"""
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=W, output_height=H)
    return Image.open(io.BytesIO(png)).split()[3], x0, x0 + size


def icon_cover(theme, seed, out_name, pill="THIS WEEK"):
    img = frame(theme, seed)
    c_left, c_right, ink = ((WHITE, CORAL, CREAM) if theme == "dark" else (NAVY, RED, NAVY))
    m_stroke, xa, xb = icon_mask(CAL_STROKE)
    m_acc, _, _ = icon_mask(CAL_ACCENT)
    if theme == "dark":
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        glow.paste((255, 190, 170, 255), (0, 0), m_stroke.filter(ImageFilter.GaussianBlur(26)).point(lambda v: int(v * 0.35)))
        img = Image.alpha_composite(img, glow)
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sh.paste((40, 30, 60, 255) if theme == "light" else (0, 0, 8, 255), (0, 0),
             ImageChops.offset(m_stroke, 0, 12).filter(ImageFilter.GaussianBlur(16)).point(lambda v: int(v * (0.28 if theme == "light" else 0.7))))
    img = Image.alpha_composite(img, sh)
    img = Image.alpha_composite(img, cm.gradient_fill(m_stroke, xa, xb, c_left, c_right))
    accent = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    accent.paste(CORAL + (255,) if theme == "dark" else RED + (255,), (0, 0), m_acc)
    img = Image.alpha_composite(img, accent)
    out = finish(img, theme, pill, c_left, c_right, ink)
    out.save(f"{OUT}/{out_name}.png")
    return out


def strip(covers, labels, out_path, d=330):
    gap = 56
    n = len(covers)
    Wt = n * d + (n + 1) * gap
    canvas = Image.new("RGB", (Wt, d + 160), (0, 0, 0))
    f = ImageFont.truetype(F + "/manrope700.ttf", 28)
    for i, (c, lab) in enumerate(zip(covers, labels)):
        sq = c.crop((0, CY - 540, W, CY + 540)).resize((d, d), Image.LANCZOS)
        mask = Image.new("L", (d * 4, d * 4), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, d * 4 - 1, d * 4 - 1], fill=255)
        mask = mask.resize((d, d), Image.LANCZOS)
        x = gap + i * (d + gap)
        ring = Image.new("L", ((d + 14) * 4, (d + 14) * 4), 0)
        ImageDraw.Draw(ring).ellipse([0, 0, (d + 14) * 4 - 1, (d + 14) * 4 - 1], outline=255, width=12)
        ring = ring.resize((d + 14, d + 14), Image.LANCZOS)
        canvas.paste((70, 70, 70), (x - 7, 53), ring)
        canvas.paste(sq, (x, 60), mask)
        ImageDraw.Draw(canvas).text((x + d // 2, d + 112), lab, font=f, fill=CREAM, anchor="mm")
    canvas.save(out_path)


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    if which in ("all", "light"):
        spec = [("THIS", "WEEK", "this-week", 11, "This Week"),
                ("UPCOMING", "EVENTS", "events", 23, "Events"),
                ("WEEKLY", "CLUBS", "clubs", 31, "Clubs"),
                ("PLAN YOUR", "VISIT", "visit", 47, "Visit"),
                ("EVENT", "RECAPS", "recaps", 59, "Recaps")]
        covers = []
        for top, word, key, seed, lab in spec:
            covers.append(word_cover("light", top, word, seed, f"light-{key}"))
            print("light", key, flush=True)
        strip(covers, [s[4] for s in spec], f"{OUT}/light-strip.png")
    if which in ("all", "icon"):
        icon_cover("light", 11, "light-icon-this-week")
        print("icon ok", flush=True)
    if which in ("all", "dark"):
        word_cover("dark", "THIS", "WEEK", 11, "dark-this-week")
        print("dark ok", flush=True)
