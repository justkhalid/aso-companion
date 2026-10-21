import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

BASE = "/tmp/claude-0/-home-claude/d7047422-f1a0-5bb0-b041-a3f441efef6b/scratchpad"
F = BASE + "/fonts"
W, H = 1080, 1920
CX, CY = 540, 960

CREAM = (244, 239, 230)
CORAL = (255, 106, 90)


def radial(cx, cy, r, color, alpha_max, power=2.0):
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / r
    a = np.clip(1 - d, 0, 1) ** power * alpha_max
    layer = np.zeros((H, W, 4), dtype=np.uint8)
    layer[..., 0], layer[..., 1], layer[..., 2] = color
    layer[..., 3] = (a * 255).astype(np.uint8)
    return Image.fromarray(layer, "RGBA")


def background():
    # deep navy base, darker at the edges like a graded photo
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - CX) / 760) ** 2 + ((yy - CY) / 1100) ** 2)
    t = np.clip(d, 0, 1)
    c0 = np.array([22, 38, 110])   # lit navy
    c1 = np.array([5, 9, 26])      # near black
    img = (c0[None, None, :] * (1 - t[..., None]) + c1[None, None, :] * t[..., None]).astype(np.uint8)
    base = Image.fromarray(img, "RGB").convert("RGBA")
    # soft stadium-style lights
    base = Image.alpha_composite(base, radial(820, 520, 520, (120, 150, 255), 0.55, 2.2))
    base = Image.alpha_composite(base, radial(240, 1380, 520, (200, 40, 50), 0.30, 2.0))
    # lens-flare arcs near the upper right edge of the circle crop
    arcs = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ad = ImageDraw.Draw(arcs)
    for r, a, w in [(500, 150, 10), (468, 80, 5)]:
        ad.arc([CX - r, CY - r, CX + r, CY + r], start=-72, end=-14, fill=(205, 220, 255, a), width=w)
    arcs = arcs.filter(ImageFilter.GaussianBlur(9))
    base = Image.alpha_composite(base, arcs)
    return base


def gradient_fill(mask, x0, x1, c_left, c_right):
    """Horizontal gradient clipped by mask (L)."""
    xs = np.linspace(0, 1, W)
    xs = np.clip((np.arange(W) - x0) / max(1, (x1 - x0)), 0, 1)
    grad = np.zeros((H, W, 4), dtype=np.uint8)
    for i in range(3):
        grad[..., i] = (c_left[i] * (1 - xs) + c_right[i] * xs)[None, :].astype(np.uint8)
    grad[..., 3] = 255
    g = Image.fromarray(grad, "RGBA")
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.paste(g, (0, 0), mask)
    return out


def text_mask(text, font, cx, cy, tracking=0):
    mask = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(mask)
    widths = [d.textlength(ch, font=font) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x = cx - total / 2
    for ch, w in zip(text, widths):
        d.text((x, cy), ch, font=font, fill=255, anchor="ls")
        x += w + tracking
    return mask, total


def spaced(draw, text, font, cx, cy, fill, spacing):
    widths = [draw.textlength(ch, font=font) for ch in text]
    total = sum(widths) + spacing * (len(text) - 1)
    x = cx - total / 2
    for ch, w in zip(text, widths):
        draw.text((x, cy), ch, font=font, fill=fill, anchor="ls")
        x += w + spacing
    return total


def build(top, word, label, out_path):
    img = background()

    f_top = ImageFont.truetype(F + "/bodoni500i.ttf", 150)
    f_word = ImageFont.truetype(F + "/bodoni600i.ttf", 285)
    f_label = ImageFont.truetype(F + "/manrope700.ttf", 27)

    # stacked title like NEXT / MATCH
    m_top, w_top = text_mask(top, f_top, CX, 830, tracking=-2)
    m_word, w_word = text_mask(word, f_word, CX, 1075, tracking=-6)

    for m, w in [(m_top, w_top), (m_word, w_word)]:
        # glow behind the letters
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        glow.paste((255, 190, 170, 255), (0, 0), m.filter(ImageFilter.GaussianBlur(26)).point(lambda v: int(v * 0.35)))
        img = Image.alpha_composite(img, glow)
        # soft shadow
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        sh.paste((0, 0, 8, 255), (0, 0), ImageChops.offset(m, 0, 10).filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * 0.7)))
        img = Image.alpha_composite(img, sh)
        x0 = CX - w / 2
        img = Image.alpha_composite(img, gradient_fill(m, x0, x0 + w, (255, 255, 255), CORAL))

    # thin outlined pill, gradient stroke
    pw, ph = 560, 74
    px0, py0 = CX - pw // 2, 1170
    ring = Image.new("L", (W, H), 0)
    rd = ImageDraw.Draw(ring)
    rd.rounded_rectangle([px0, py0, px0 + pw, py0 + ph], radius=ph // 2, outline=255, width=3)
    img = Image.alpha_composite(img, gradient_fill(ring, px0, px0 + pw, (255, 255, 255), CORAL))
    td = ImageDraw.Draw(img)
    spaced(td, label, f_label, CX, py0 + ph // 2 + 10, CREAM + (255,), 5)

    # film grain
    noise = Image.effect_noise((W, H), 46).convert("L")
    grain = Image.merge("RGBA", (noise, noise, noise, Image.new("L", (W, H), 26)))
    img = Image.alpha_composite(img, grain)

    img.convert("RGB").save(out_path)
    return img.convert("RGB")


def circle_preview(cover, out_path, d=620):
    sq = cover.crop((0, CY - 540, W, CY + 540)).resize((d, d), Image.LANCZOS)
    mask = Image.new("L", (d, d), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, d - 1, d - 1], fill=255)
    canvas = Image.new("RGB", (d + 120, d + 190), (0, 0, 0))
    ring = Image.new("L", (d + 16, d + 16), 0)
    ImageDraw.Draw(ring).ellipse([0, 0, d + 15, d + 15], outline=255, width=4)
    canvas.paste((70, 70, 70), (52, 52), ring)
    canvas.paste(sq, (60, 60), mask)
    ImageDraw.Draw(canvas).text((canvas.width // 2, d + 130), "This Week", font=ImageFont.truetype(F + "/manrope700.ttf", 38), fill=CREAM, anchor="mm")
    canvas.save(out_path)


if __name__ == "__main__":
    out = BASE + "/covers/madrid-this-week.png"
    cover = build("THIS", "WEEK", "AMERICAN SPACE OUJDA", out)
    circle_preview(cover, BASE + "/covers/madrid-this-week-preview.png")
    print("ok")
