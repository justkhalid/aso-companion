import sys; sys.path.insert(0, ".")
from english import *
import qrcode
URL = "https://forms.gle/JWZ6PnQncwKWRo7z7"
def wrap(d, txt, font, maxw):
    words, lines, cur = txt.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=font) <= maxw: cur = t
        else: lines.append(cur); cur = w
    lines.append(cur); return lines
img, hl = header(base(11, "events"), "USEFUL LINKS", "ENGLISH READING", "ACTIVITY")
d = ImageDraw.Draw(img)
y = hl + 90
y += 10
for ln_ in wrap(d, "Tell us your reading preferences, and come let's read it together!", M(500, 33), 780):
    d.text((CX, y + 20), ln_, font=M(500, 33), fill=NAVY + (230,), anchor="mm"); y += 46
y += 60
# QR inside viewfinder corners
s = 430; x0 = CX - s // 2; y0 = y + 20
img = ring_corners(img, x0 - 30, y0 - 30, x0 + s + 30, y0 + s + 30, 80)
qr = qrcode.QRCode(border=0, box_size=10, error_correction=qrcode.constants.ERROR_CORRECT_M); qr.add_data(URL); qr.make()
q = qr.make_image(fill_color="black", back_color="white").convert("L").resize((s, s), Image.NEAREST)
mask = q.point(lambda v: 255 if v < 128 else 0)
qa = Image.new("L", (W, H), 0); qa.paste(mask, (x0, y0))
qimg = cm.gradient_fill(qa, x0, x0 + s, NAVY, (150, 24, 44))
img = Image.alpha_composite(img, qimg)
y = y0 + s + 100
d = ImageDraw.Draw(img)
cm.spaced(d, "FILL OUT THE FORM", M(700, 28), CX, y + cap(28), RED + (255,), 7); y += cap(28) + 40
pill = rrect([CX - 330, y, CX + 330, y + 96], 48, 3)
img = Image.alpha_composite(img, cm.gradient_fill(pill, CX - 330, CX + 330, NAVY, RED))
d = ImageDraw.Draw(img)
cm.spaced(d, "forms.gle/JWZ6PnQncwKWRo7z7", M(700, 25), CX, y + 48 + cap(25) // 2, NAVY + (255,), 2)
print("end", y + 96)
finish(img, "links-english-reading")
