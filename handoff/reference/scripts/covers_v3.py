import sys, os, io
sys.path.insert(0, "/tmp/claude-0/-home-claude/d7047422-f1a0-5bb0-b041-a3f441efef6b/scratchpad")
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import covers_v2 as c2
import cover_madrid as cm

W, H, CX, CY, BASE = c2.W, c2.H, c2.CX, c2.CY, c2.BASE
OUT = BASE + "/covers_v3"
os.makedirs(OUT, exist_ok=True)
NAVY, RED = c2.NAVY, c2.RED

ICONS = {
    "clubs": (
        """<circle cx="5.2" cy="10" r="2" fill="none"/>
<path d="M2 17.6c0-2.2 1.3-3.8 3.2-3.8" fill="none"/>
<circle cx="18.8" cy="10" r="2" fill="none"/>
<path d="M22 17.6c0-2.2-1.3-3.8-3.2-3.8" fill="none"/>
<path d="M7.4 19.4c0-2.8 2-4.9 4.6-4.9s4.6 2.1 4.6 4.9" fill="none"/>""",
        """<circle cx="12" cy="9.2" r="2.45" fill="#000" stroke="none"/>"""),
    "events": (
        """<path d="M3 8.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.6a2 2 0 0 0 0 3.8v1.6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.6a2 2 0 0 0 0-3.8z" fill="none"/>
<path d="M15.2 8v8" fill="none" stroke-dasharray="1.3 1.7"/>""",
        """<path d="M9 9.9l.8 1.65 1.8.24-1.3 1.25.33 1.8L9 14l-1.63.84.33-1.8-1.3-1.25 1.8-.24z" fill="#000" stroke="none"/>"""),
    "classes": (
        """<path d="M5 4h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H11l-4.5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="none"/>
<path d="M9.4 12.3L12 6.6l2.6 5.7" fill="none"/>""",
        """<path d="M10.4 10.5h3.2" fill="none"/>"""),
    "visit": (
        """<path d="M12 21.4s-6.6-5.6-6.6-11.2a6.6 6.6 0 0 1 13.2 0c0 5.6-6.6 11.2-6.6 11.2z" fill="none"/>""",
        """<circle cx="12" cy="10.2" r="2.6" fill="#000" stroke="none"/>"""),
    "recaps": (
        """<rect x="3" y="5.5" width="18" height="13" rx="2.6" fill="none"/>""",
        """<path d="M10 9.4l5 2.6-5 2.6z" fill="#000" stroke-linejoin="round"/>"""),
}


def grain(img, a=18):
    noise = Image.effect_noise((W, H), 46).convert("L")
    g = Image.merge("RGBA", (noise, noise, noise, Image.new("L", (W, H), a)))
    return Image.alpha_composite(img.convert("RGBA"), g).convert("RGB")


def icon_only(key, seed, out_name):
    stroke, accent = ICONS[key]
    img = c2.frame("light", seed)
    m_stroke, xa, xb = c2.icon_mask(stroke, size=520, cy=CY, sw=0.9)
    m_acc, _, _ = c2.icon_mask(accent, size=520, cy=CY, sw=0.9)
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    both = ImageChops.lighter(m_stroke, m_acc)
    sh.paste((40, 30, 60, 255), (0, 0), ImageChops.offset(both, 0, 12).filter(ImageFilter.GaussianBlur(16)).point(lambda v: int(v * 0.26)))
    img = Image.alpha_composite(img, sh)
    img = Image.alpha_composite(img, cm.gradient_fill(m_stroke, xa, xb, NAVY, RED))
    acc = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    acc.paste(RED + (255,), (0, 0), m_acc)
    img = Image.alpha_composite(img, acc)
    out = grain(img)
    out.save(f"{OUT}/{out_name}.png")
    return out


if __name__ == "__main__":
    c2.OUT = OUT
    covers, labels = [], []
    covers.append(c2.word_cover("light", "THIS", "MONTH", 11, "1-this-month"))
    labels.append("This Month")
    spec = [("clubs", 31, "Clubs"), ("events", 23, "Events"), ("classes", 71, "English Classes"),
            ("visit", 47, "Visit"), ("recaps", 59, "Recaps")]
    for i, (key, seed, lab) in enumerate(spec, start=2):
        covers.append(icon_only(key, seed, f"{i}-{key}"))
        labels.append(lab)
        print(key, flush=True)
    c2.strip(covers, labels, f"{OUT}/strip.png", d=300)
    print("done")
