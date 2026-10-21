import sys, io; sys.path.insert(0, ".")
import numpy as np, cv2, cairosvg
from PIL import Image, ImageDraw, ImageFont
import posters2 as P2
import footers as FT
F = P2.F; CREAM = P2.CREAM; INK = P2.INK
def svg_icon(body, px, color=(244, 240, 232)):
    c = "#%02x%02x%02x" % color
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{px*4}" height="{px*4}" viewBox="0 0 24 24" fill="none" stroke="{c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">{body}</svg>'
    im = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode()))).convert("RGBA")
    return im.resize((px, px), Image.LANCZOS)
IG = '<rect x="3" y="3" width="18" height="18" rx="5.2"/><circle cx="12" cy="12" r="4.1"/><circle cx="17.3" cy="6.7" r="0.6" fill="#f4f0e8" stroke="none"/>'
FB = '<circle cx="12" cy="12" r="9.2"/><path d="M13.4 20.6v-7.4h2.5l.4-2.9h-2.9V8.5c0-.8.3-1.4 1.5-1.4h1.5V4.6a19 19 0 0 0-2.2-.1c-2.2 0-3.7 1.3-3.7 3.800v2H8.000v2.900h2.500v7.400"/>'
PIN = '<path d="M12 21.4s-6.6-5.6-6.6-11.2a6.600 6.600 0 0 1 13.200 0c0 5.600-6.600 11.200-6.600 11.200z"/><circle cx="12" cy="10.200" r="2.500"/>'
def foot_A2(img):
    sc = Image.new("RGBA", img.size, (0, 0, 0, 0)); a = np.zeros((1440, 1080), np.float32)
    a[1300:] = np.linspace(0, 1, 140)[:, None] ** 1.4 * 0.62
    sc.putalpha(Image.fromarray((a * 255).astype(np.uint8))); sc.paste(INK, (0, 0), sc.getchannel("A"))
    img = Image.alpha_composite(img.convert("RGBA"), sc).convert("RGB")
    img = FT.gline(img, 56, 1024, 1382, (244, 240, 232), (255, 120, 110), 235)
    d = ImageDraw.Draw(img)
    base = 1416; isz = 22
    fa = ImageFont.truetype(F + "/manrope700.ttf", 18); fb = ImageFont.truetype(F + "/manrope500.ttf", 19)
    # left: pin + name
    pin = svg_icon(PIN, isz); img.paste(pin, (56, base - 19), pin)
    P2.spaced(d, 56 + isz + 12, base, "AMERICAN SPACE OUJDA", fa, CREAM + (255,), 5)
    # right: IG FB handle
    wh = d.textlength("@americanspaceoujda", font=fb) + 18 * 1
    hx = 1024 - wh
    fb_i = svg_icon(FB, isz); ig_i = svg_icon(IG, isz)
    x = hx - 14 - isz; img.paste(fb_i, (int(x), base - 19), fb_i)
    x -= 12 + isz; img.paste(ig_i, (int(x), base - 19), ig_i)
    P2.spaced(d, 1024, base, "@americanspaceoujda", fb, CREAM + (235,), 1, anchor="r")
    return img
if __name__ == "__main__":
    outs = []
    for name in ("discover-africa", "psychology"):
        cl = cv2.imread(f"final/posters/clean-{name}.png")
        o = f"final/posters-v2/_{name}-A2.png"; P2.compose(name, cl, o, footer=foot_A2); outs.append(o)
    crops = [Image.open(o).crop((0, 1330, 1080, 1440)) for o in outs]
    sh = Image.new("RGB", (1080, 240), (22, 22, 22)); sh.paste(crops[0], (0, 4)); sh.paste(crops[1], (0, 126)); sh.save("final/footer-A2-crops.png")
    t = (360, 480); gp = 16
    s2 = Image.new("RGB", (2 * t[0] + 3 * gp, t[1] + 2 * gp), (22, 22, 22))
    for i, o in enumerate(outs): s2.paste(Image.open(o).resize(t, Image.LANCZOS), (gp + i * (t[0] + gp), gp))
    s2.save("final/footer-A2-sheet.png"); print("ok")
