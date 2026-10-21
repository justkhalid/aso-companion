import sys; sys.path.insert(0, ".")
from english import *
from clubs_themed import rrect
OUTB = FINAL + "/bilingual-stories"; os.makedirs(OUTB, exist_ok=True)
AR = lambda w, px: ImageFont.truetype(F + f"/cairoFull{w}.ttf", px)
def ar(d, txt, px, xy, fill, w=700, anchor="mm"):
    d.text(xy, txt, font=AR(w, px), fill=fill, anchor=anchor, direction="rtl", language="ar")
def save(img, name):
    noise = Image.effect_noise((W, H), 46).convert("L")
    g = Image.merge("RGBA", (noise, noise, noise, Image.new("L", (W, H), 18)))
    res = Image.alpha_composite(img, g).convert("RGB"); res.save(f"{OUTB}/{name}.png"); print(name, flush=True); return res
def fit(d, txt, px, maxw=860, sp=2):
    while px > 24:
        f = M(500, px)
        if sum(d.textlength(ch, font=f) + sp for ch in txt) <= maxw: return f
        px -= 2
    return M(500, 24)
def sub_ar(img, hl, txt, px=54, dy=76):
    d = ImageDraw.Draw(img); ar(d, txt, px, (CX, hl + dy), NAVY + (255,)); return img

def map_slot(img, box):
    gm = Image.open("gmap.jpg").convert("RGB").crop((60, 60, 800, 600))
    bw, bh = box[2] - box[0], box[3] - box[1]
    gm = gm.resize((bw, bh), Image.LANCZOS)
    m = rrect(box, 34)
    sh = Image.new("RGBA", (W, H), (30, 30, 60, 0)); sh.putalpha(ImageChops.offset(m, 0, 14).filter(ImageFilter.GaussianBlur(22)).point(lambda v: int(v * 0.35)))
    img = Image.alpha_composite(img, sh)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0)); layer.paste(gm.convert("RGBA"), (box[0], box[1])); layer.putalpha(m)
    img = Image.alpha_composite(img, layer)
    px = box[0] + int(312 * bw / 740); py = box[1] + int(231 * bh / 540)
    ms, ma, bx = icon_masks("visit", 110, px, py - 48)
    return S.paint_icon(img, ms, ma, bx)

def v_map():
    img, hl = header(base(31, "visit"), "AMERICAN SPACE OUJDA", "VISIT", "US")
    img = sub_ar(img, hl, "زوروا الفضاء الأمريكي بوجدة", 50, 70)
    box = [100, hl + 130, 980, hl + 130 + 560]
    img = map_slot(img, box)
    d = ImageDraw.Draw(img); y = box[3] + 62
    cm.spaced(d, "BOULEVARD MOHAMMED VI AND RUE DAKHLA", M(700, 25), CX, y + cap(25), NAVY + (255,), 3); y += cap(25) + 36
    ar(d, "تقاطع شارع محمد السادس وزنقة الداخلة، وجدة", 38, (CX, y + 12), NAVY + (240,), 500); y += 62
    cm.spaced(d, "05 36 50 67 57", M(700, 30), CX, y + cap(30), RED + (255,), 6)
    return save(img, "bi-1-visit-map")

def rows_bi(img, y0, rows, h=210):
    for i, (en, ar_, sub_en, sub_ar_) in enumerate(rows):
        if i:
            img = grad_line(img, CX - 200, CX + 200, y0 - 8, 2, NAVY, RED, 130)
        d = ImageDraw.Draw(img)
        cm.spaced(d, en, M(700, 25), CX, y0 + 30, RED + (255,), 7)
        d.text((CX, y0 + 88), sub_en, font=fit(d, sub_en, 44), fill=NAVY + (255,), anchor="mm")
        ar(d, sub_ar_, 38, (CX, y0 + 148), NAVY + (225,), 500)
        y0 += h
    return img

def v_hours():
    img, hl = header(base(23, "visit"), "THE LIBRARY", "LIBRARY", "HOURS")
    img = sub_ar(img, hl, "ساعات عمل المكتبة", 54, 76)
    d = ImageDraw.Draw(img); y = hl + 190
    cm.spaced(d, "9 AM - 5 PM", M(700, 96), CX, y + cap(96), NAVY + (255,), 4); y += cap(96) + 20
    d.text((CX, y + 36), "من 9:00 صباحا إلى 5:00 مساء", font=AR(700, 38), fill=NAVY + (230,), anchor="mm", direction="rtl", language="ar"); y += 78
    cm.spaced(d, "MONDAY TO FRIDAY", M(700, 28), CX, y + cap(28), RED + (255,), 7); y += cap(28) + 14
    ar(d, "من الاثنين إلى الجمعة", 38, (CX, y + 30), RED + (255,)); y += 120
    rows = [("CLOSED", None, "Saturday, Sunday and holidays", "مغلقة أيام السبت والأحد والعطل"), ("CLUBS AND EVENTS", None, "Can run until 6 PM", "الأندية والأنشطة قد تمتد إلى 6 مساء")]
    img = rows_bi(img, y, rows, 190)
    return save(img, "bi-2-library-hours")

def join_ar():
    img = base(47, "visit")
    d = ImageDraw.Draw(img)
    ar(d, "التسجيل", 40, (CX, 336), tuple(int(v * 0.8) for v in RED) + (255,))
    # Arabic gradient title
    m = Image.new("L", (W, H), 0); md = ImageDraw.Draw(m)
    f1, f2 = AR(700, 108), AR(700, 190)
    md.text((CX, 470), "انضموا إلى", font=f1, fill=255, anchor="mm", direction="rtl", language="ar")
    md.text((CX, 640), "الفضاء", font=f2, fill=255, anchor="mm", direction="rtl", language="ar")
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sh.paste((40, 30, 60, 255), (0, 0), ImageChops.offset(m, 0, 8).filter(ImageFilter.GaussianBlur(12)).point(lambda v: int(v * 0.22)))
    img = Image.alpha_composite(img, sh)
    img = Image.alpha_composite(img, cm.gradient_fill(m, 200, 880, NAVY, RED))
    hl = 790
    img = grad_line(img, CX - 260, CX + 260, hl)
    groups = [("للتسجيل أحضروا", ["صورتين شخصيتين", "نسخة من البطاقة الوطنية"]),
              ("المنخرطون يستفيدون من", ["ولوج المكتبة", "الحواسيب والإنترنت المجاني", "إعارة الكتب"]),
              ("الأندية والأنشطة", ["مجانية دون الحاجة إلى التسجيل"]),
              ("الدروس الإنجليزية", ["مجانية للمنخرطين في الفضاء الأمريكي", "التسجيل خلال فترة محددة", "التفاصيل في الهايلايت"])]
    LH, HH, GG = 60, 70, 46
    tot = sum(HH + LH * len(ls) for _, ls in groups) + GG * (len(groups) - 1)
    y = int((hl + 40 + 1790) / 2 - tot / 2)
    for i, (hd, ls) in enumerate(groups):
        if i: img = grad_line(img, CX - 200, CX + 200, y - GG // 2, 2, NAVY, RED, 130)
        d = ImageDraw.Draw(img)
        ar(d, hd, 34, (CX, y + 24), RED + (255,)); y += HH
        for t in ls:
            px = 40
            while d.textlength(t, font=AR(500, px), direction="rtl", language="ar") > 860: px -= 2
            ar(d, t, px, (CX, y + 22), NAVY + (255,), 500); y += LH
        y += GG
    return save(img, "ar-3-join-the-space")

def e_open():
    img = base(47)
    sb = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(sb)
    for k in range(0, 360, 6):
        a = math.radians(k)
        sd.line([(CX + 330 * math.cos(a), 560 + 330 * math.sin(a)), (CX + 1500 * math.cos(a), 560 + 1500 * math.sin(a))], fill=RED + (22,), width=3)
    img = Image.alpha_composite(img, sb)
    img, hl = header(img, "ENGLISH CLASSES", "REGISTRATION", "OPEN")
    img = sub_ar(img, hl, "التسجيل مفتوح", 62, 80)
    d = ImageDraw.Draw(img)
    cm.spaced(d, "KIDS   |   TEENS   |   ADULTS", M(700, 26), CX, hl + 170 + cap(26), NAVY + (255,), 6)
    ar(d, "الأطفال  ·  المراهقون  ·  الكبار", 34, (CX, hl + 232), NAVY + (230,), 500)
    s = 440; x0 = CX - s // 2; y0 = hl + 290
    img = ring_corners(img, x0, y0, x0 + s, y0 + s, 80)
    d = ImageDraw.Draw(img)
    cm.spaced(d, "QR CODE OR FORM", M(700, 22), CX, y0 + s // 2 + 8, NAVY + (120,), 7)
    ar(d, "رمز QR أو الاستمارة", 30, (CX, y0 + s // 2 + 54), NAVY + (110,), 500)
    py = y0 + s + 70
    pill = rrect([CX - 300, py, CX + 300, py + 90], 45, 3)
    img = Image.alpha_composite(img, cm.gradient_fill(pill, CX - 300, CX + 300, NAVY, RED))
    d = ImageDraw.Draw(img)
    cm.spaced(d, "LINK STICKER HERE", M(700, 24), CX, py + 45 + 8, NAVY + (150,), 7)
    y = py + 90 + 66
    cm.spaced(d, "FREE ENGLISH CLASSES", M(700, 27), CX, y + cap(27), RED + (255,), 6); y += cap(27) + 18
    ar(d, "دروس مجانية في اللغة الإنجليزية", 36, (CX, y + 24), RED + (255,)); y += 64
    cm.spaced(d, "YOU MUST BE A REGISTERED ASO MEMBER", M(500, 22), CX, y + cap(22), NAVY + (230,), 3); y += cap(22) + 14
    ar(d, "شرط الانخراط في الفضاء الأمريكي", 32, (CX, y + 22), NAVY + (230,), 500)
    return save(img, "bi-4-english-registration-open")

def e_closed():
    img = base(59)
    img, hl = header(img, "ENGLISH CLASSES", "REGISTRATION", "CLOSED")
    img = sub_ar(img, hl, "التسجيل مغلق", 62, 80)
    oy = hl + 190
    bm = Image.new("L", (W, H), 0); ImageDraw.Draw(bm).rounded_rectangle([110, 0, 970, 250], radius=26, fill=255)
    hm = Image.new("L", (W, H), 0); hd = ImageDraw.Draw(hm)
    for k in range(-400, 1400, 22): hd.line([(k, 250), (k + 250, 0)], fill=255, width=3)
    hatch = Image.new("RGBA", (W, H), RED + (0,)); hatch.putalpha(ImageChops.multiply(hm, bm).point(lambda v: int(v * 0.30)))
    fill = Image.new("RGBA", (W, H), (252, 250, 246, 0)); fill.putalpha(bm.point(lambda v: int(v * 0.7)))
    outl = Image.new("L", (W, H), 0); ImageDraw.Draw(outl).rounded_rectangle([110, 0, 970, 250], radius=26, outline=255, width=3)
    lay = Image.alpha_composite(Image.alpha_composite(fill, hatch), cm.gradient_fill(outl, 110, 970, NAVY, RED))
    lay = ImageChops.offset(lay, 0, oy).rotate(-4, resample=Image.BICUBIC, center=(CX, oy + 125))
    img = Image.alpha_composite(img, lay)
    d = ImageDraw.Draw(img)
    cm.spaced(d, "SEMESTER 1", M(700, 50), CX, oy + 70 + cap(50) // 2, NAVY + (255,), 8)
    cm.spaced(d, "IS NOW FULL", M(500, 28), CX, oy + 128 + cap(28) // 2, RED + (255,), 8)
    ar(d, "اكتمل عدد المسجلين في الفصل الأول", 36, (CX, oy + 196), NAVY + (255,))
    y = oy + 250 + 100
    d.text((CX, y), "Next registration", font=BOD(70), fill=NAVY + (255,), anchor="mm"); y += 72
    d.text((CX, y), "before Semester 2", font=BOD(70), fill=NAVY + (255,), anchor="mm"); y += 70
    ar(d, "التسجيل المقبل قبل بداية الفصل الثاني", 40, (CX, y + 20), RED + (255,)); y += 90
    img = grad_line(img, CX - 120, CX + 120, y); d = ImageDraw.Draw(img); y += 50
    cm.spaced(d, "WE WILL LET YOU KNOW", M(700, 26), CX, y + cap(26), RED + (255,), 6); y += cap(26) + 18
    ar(d, "سنعلمكم بموعد التسجيل المقبل", 34, (CX, y + 22), NAVY + (230,), 500); y += 80
    cm.spaced(d, "FREE FOR REGISTERED ASO MEMBERS", M(700, 23), CX, y + cap(23), RED + (255,), 5); y += cap(23) + 14
    ar(d, "مجانية للمنخرطين في الفضاء الأمريكي", 32, (CX, y + 22), NAVY + (230,), 500)
    return save(img, "bi-5-english-registration-closed")

def sched():
    img, hl = header(base(23, "classes"), "ENGLISH CLASSES", "WEEKLY", "SCHEDULE")
    img = sub_ar(img, hl, "جدول الدروس الأسبوعي", 50, 66)
    days = [("Tuesday", "الثلاثاء", [("Adults Intermediate", "4 - 6 PM")]),
            ("Wednesday", "الأربعاء", [("Kids Beginners", "2 - 4 PM"), ("Adults Beginners", "4 - 6 PM")]),
            ("Friday", "الجمعة", [("Adults Intermediate", "3 - 5 PM")]),
            ("Saturday", "السبت", [("Kids Intermediate", "2 - 4 PM"), ("Teens Beginners", "2 - 4 PM"), ("Adults Beginners", "4 - 6 PM")]),
            ("Sunday", "الأحد", [("Kids Beginners", "10:30 AM - 12:30 PM"), ("Teens Beginners", "2 - 4 PM")])]
    LH = 58
    tot = sum(max(1, len(c)) * LH + 46 for _, _, c in days)
    y = int((hl + 130 + 1780) / 2 - tot / 2)
    for i, (day, dar, cl) in enumerate(days):
        h = len(cl) * LH
        if i: img = grad_line(img, 110, 970, y - 23, 2, NAVY, RED, 130)
        d = ImageDraw.Draw(img)
        d.text((110, y + h // 2 - 14), day, font=BOD(64), fill=NAVY + (255,), anchor="lm")
        ar(d, dar, 34, (110, y + h // 2 + 30), RED + (255,), 700, "lm")
        for j, (n, t) in enumerate(cl):
            yy = y + j * LH + LH // 2 - 4
            d.text((970, yy), t, font=M(700, 28), fill=RED + (255,), anchor="rm")
            d.text((970 - d.textlength(t, font=M(700, 28)) - 26, yy), n, font=M(500, 29), fill=NAVY + (255,), anchor="rm")
        y += h + 46
    return save(img, "bi-6-weekly-schedule")

if __name__ == "__main__":
    ims = [v_map(), v_hours(), join_ar(), e_open(), e_closed(), sched()]
    tw, th, gp = 300, 533, 24
    sheet = Image.new("RGB", (3 * tw + 4 * gp, 2 * th + 3 * gp), (22, 22, 22))
    for i, s_ in enumerate(ims): sheet.paste(s_.resize((tw, th), Image.LANCZOS), (gp + (i % 3) * (tw + gp), gp + (i // 3) * (th + gp)))
    sheet.save(FINAL + "/bilingual-sheet.png"); print("FIN")
