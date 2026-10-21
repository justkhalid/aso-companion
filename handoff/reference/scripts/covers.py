import sys; sys.path.insert(0, ".")
import events  # registers extra themes
from clubs_themed import *
import clubs_themed as CT
OUTC = FINAL + "/club-covers"; os.makedirs(OUTC, exist_ok=True)

N='fill="none"'
S.c3.ICONS.update({
 "i-movie": (f'<rect x="3" y="9.5" width="18" height="10.5" rx="1.6" {N}/><path d="M3.4 9.5L19.6 5.4l.9 3.5" {N}/><path d="M7.6 8.4l2.1-2.7M12.4 7.2l2.1-2.7" {N}/>', '<path d="M10.4 12.6l4.4 2.6-4.4 2.6z" fill="#000" stroke-linejoin="round"/>'),
 "i-speaking": (f'<rect x="9" y="3" width="6" height="11" rx="3" {N}/><path d="M5.5 11.2a6.5 6.5 0 0 0 13 0M12 17.7V21M8.8 21h6.4" {N}/>', '<path d="M9.2 8.2h5.6" fill="none"/>'),
 "i-philo": (f'<ellipse cx="12" cy="12" rx="9.6" ry="3.7" {N}/><ellipse cx="12" cy="12" rx="9.6" ry="3.7" transform="rotate(60 12 12)" {N}/><ellipse cx="12" cy="12" rx="9.6" ry="3.7" transform="rotate(-60 12 12)" {N}/>', '<circle cx="12" cy="12" r="1.9" fill="#000" stroke="none"/>'),
 "i-sports": (f'<circle cx="12" cy="12" r="9" {N}/><path d="M3 12h18M12 3v18" {N}/>', '<path d="M5.5 5.6c3.1 3.2 3.1 9.6 0 12.8M18.5 5.6c-3.1 3.2-3.1 9.6 0 12.8" fill="none"/>'),
 "i-africa": (f'<circle cx="12" cy="12" r="9" {N}/><ellipse cx="12" cy="12" rx="4" ry="9" {N}/><path d="M3.4 8.6h17.2M3.4 15.4h17.2" {N}/>', '<circle cx="15.6" cy="9.8" r="1.7" fill="#000" stroke="none"/>'),
 "i-psy": (f'<path d="M9.4 17.4h5.2M10.2 20.4h3.6" {N}/><path d="M12 3.2a6 6 0 0 0-3.7 10.7c.6.5 1 1.3 1 2.1v1.4h5.4V16c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3.2z" {N}/>', '<path d="M10.2 9.8l1.8 2.4 1.8-2.4" fill="none"/>'),
 "i-reading": (f'<path d="M12 6.6C10 5 6.4 4.7 3 5.6v12.6c3.4-.9 7-.6 9 .9 2-1.5 5.6-1.8 9-.9V5.6C17.6 4.7 14 5 12 6.6z" {N}/><path d="M12 6.6v12.5" {N}/>', '<path d="M5.8 9.2h3.4M5.8 12.2h3.4M14.8 9.2h3.4M14.8 12.2h3.4" fill="none"/>'),
})

S.c3.ICONS.update({
 "i-movie": (f'<circle cx="12" cy="12" r="9.2" {N}/><circle cx="12" cy="6.4" r="1.9" {N}/><circle cx="17.6" cy="12" r="1.9" {N}/><circle cx="12" cy="17.6" r="1.9" {N}/><circle cx="6.4" cy="12" r="1.9" {N}/>', '<circle cx="12" cy="12" r="1.7" fill="#000" stroke="none"/>'),
 "i-philo": (f'<path d="M7.2 17.4a4.2 4.2 0 0 1-.8-8.3 5.6 5.6 0 0 1 10.8-.9 4.5 4.5 0 0 1 .2 9.2z" {N}/><circle cx="8" cy="20.2" r="1" {N}/><circle cx="5.2" cy="22.2" r=".6" {N}/>', f'<ellipse cx="12" cy="12.6" rx="4.4" ry="1.6" transform="rotate(55 12 12.6)" {N}/><ellipse cx="12" cy="12.6" rx="4.4" ry="1.6" transform="rotate(-55 12 12.6)" {N}/><circle cx="12" cy="12.6" r="1" fill="#000" stroke="none"/>'),
 "i-africa": (f'<path d="M7 4.8L10.6 3.6 14.4 4 16.2 6 17.6 8.4 20.6 9.6 18.6 12.4 17 14.4 16 17.6 14.2 20.8 12.4 20.6 11.2 17.4 10.6 14.2 8.4 13.4 5.6 13.2 3.6 10.6 4.8 7.4z" {N}/>', '<circle cx="8.4" cy="6.6" r="1.4" fill="#000" stroke="none"/>'),
 "i-psy": (f'<path d="M8.4 20.6v-3.4C5.8 15.800 4.4 13.300 4.4 10.400A7.500 7.500 0 0 1 12 3a7.500 7.500 0 0 1 7.500 7.400c0 1.800-.8 3-1.800 4-.6.600-1 1.300-1 2.200v4z" {N}/>', '<path d="M9.2 10.200c0-1.800 1.800-2.700 3.100-1.900 1.400-.7 3 .2 3 1.800 0 .8-.5 1.400-1 1.700.1 1-.6 1.900-1.700 1.900" fill="none"/><path d="M12.200 14.400v.2" fill="none"/>'),
})

BR = "M12 5.4C10.6 3.5 7.6 3.7 6.8 5.9 4.6 6.1 3.4 8.3 4.3 10.1 3.2 11.3 3.5 13.3 4.9 14.1 5 16.1 6.9 17.3 8.6 16.7 9.1 18.2 10.6 19 12 18.2z"
S.c3.ICONS.update({
 "i-speaking": (f'<circle cx="12" cy="5.6" r="2.6" {N}/><path d="M5 11h14l-1.6 10H6.6z" {N}/>', '<path d="M17.6 3.4a4.6 4.6 0 0 1 0 4.4M20 2a7.2 7.2 0 0 1 0 7.2M6.4 3.4a4.6 4.6 0 0 0 0 4.4M4 2a7.2 7.2 0 0 0 0 7.2" fill="none"/>'),
 "i-philo": (f'<path d="M2.6 14.4L12 10.4l9.4 4zM5 14.6V19.6M9.7 14.6V19.6M14.3 14.6V19.6M19 14.6V19.6M3 21.4h18" {N}/>', f'<ellipse cx="12" cy="5" rx="5" ry="1.9" transform="rotate(60 12 5)" {N}/><ellipse cx="12" cy="5" rx="5" ry="1.9" transform="rotate(-60 12 5)" {N}/><circle cx="12" cy="5" r="1.1" fill="#000" stroke="none"/>'),
 "i-psy": (f'<path d="{BR}" {N}/><g transform="translate(24 0) scale(-1 1)"><path d="{BR}" {N}/></g><path d="M12 5.4V18.2M9.4 21h5.2" {N}/>', '<path d="M7.6 9.6c1.100 0 1.900.5 2.200 1.500M7 13.800c1.200-.1 2.200-.7 2.700-1.700M16.400 9.600c-1.100 0-1.900.5-2.200 1.500M17 13.800c-1.200-.1-2.200-.7-2.700-1.700" fill="none"/>'),
})

S.c3.ICONS.update({"i-psy": (f'<path d="M4.6 4.2v4.6a7.4 7.4 0 0 0 14.800 0V4.200" {N}/><path d="M12 3.2V21M8 21h8" {N}/>', '<path d="M12 3.2v5.2" fill="none"/>')})

S.c3.ICONS.update({"i-psy": (f'<path d="M6.5 15.6C4 15 2.8 12.6 3.6 10.4 3.2 8 5 6 7.2 6.2 8.2 4.2 11 3.6 12.8 4.8 14.6 3.6 17.4 4.4 18 6.6 20.2 7.2 21.2 9.6 20.2 11.6 21 13.6 19.6 15.8 17.4 15.8 16.600 17.400 14.800 17.800 13.400 17 12.200 18.400 9.600 18.400 8.600 16.800 7.800 16.600 7 16.200 6.500 15.600z" {N}/><path d="M11.200 18.200l.4 3h2.400" {N}/>', '<path d="M8 10c1.200-.2 2.200.4 2.600 1.400M12.800 7.400c-.2 1.200.4 2.200 1.400 2.800M10.600 13.800c1.400-.4 2.600.2 3.200 1.200M15.600 11.800c.8-.6 1.800-.6 2.600 0" fill="none"/>')})
ICON = {"movie-discussion":"i-movie","public-speaking":"i-speaking","philo-physics":"i-philo","sports":"i-sports","discover-africa":"i-africa","psychology":"i-psy","english-reading":"i-reading"}
Y0 = 420
SEEDS = {'movie-discussion':11,'public-speaking':12,'philo-physics':13,'sports':14,'discover-africa':15,'psychology':16,'english-reading':17}
def cover(slug, kicker, top, word, sched):
    c1, c2_, ink, decor = THEMES[slug]
    S.NAVY, S.RED = c1, c2_
    import covers_v2 as c2v
    img = c2v.frame("light", SEEDS.get(slug, 21))
    glow = Image.new("RGBA", (W, H), c2_ + (0,))
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    g = np.clip(1 - np.hypot((xx - 540) / 720, (yy - 1000) / 620), 0, 1) ** 1.6
    glow.putalpha(Image.fromarray((g * 38).astype(np.uint8)))
    img = Image.alpha_composite(img, glow)
    if slug != 'psychology': img = Image.alpha_composite(img, decor(c1, c2_))
    img = logo_at(img, 515, 62)
    ms, ma, bx = icon_masks(ICON[slug], 570, 540, 875)
    img = S.paint_icon(img, ms, ma, bx)
    cap = lambda px: int(px * 0.72)
    fw, ft, gap, t_top, w_bot = title_layout(top, word, 86, 44)
    d = ImageDraw.Draw(img)
    f_k = ImageFont.truetype(F + "/manrope700.ttf", 27)
    cm.spaced(d, kicker, f_k, CX, 1185 + cap(22), tuple(int(v * 0.72) for v in c2_) + (255,), 8)
    ty = 1185 + cap(22) + 56
    img = S.draw_title(img, fw, ft, gap, top, word, int(ty - t_top))
    tb = ty + (w_bot - t_top); hl = tb + 26
    ln = Image.new("L", (W, H), 0); ImageDraw.Draw(ln).rectangle([CX - 230, hl, CX + 230, hl + 2], fill=255)
    img = Image.alpha_composite(img, cm.gradient_fill(ln, CX - 230, CX + 230, c1, c2_))
    d = ImageDraw.Draw(img)
    img = img.crop((0, Y0, W, Y0 + W))
    noise = Image.effect_noise((W, W), 46).convert("L")
    grain = Image.merge("RGBA", (noise, noise, noise, Image.new("L", (W, W), 18)))
    res = Image.alpha_composite(img, grain).convert("RGB")
    res.save(f"{OUTC}/cover-{slug}.png"); print(slug, flush=True); return res

LIST = [
 ("movie-discussion", "WEEKLY CLUB", "MOVIE", "DISCUSSION", "WEDNESDAYS"),
 ("public-speaking", "WEEKLY CLUB", "PUBLIC", "SPEAKING", "SATURDAYS"),
 ("philo-physics", "WEEKLY CLUB", "PHILO", "PHYSICS", "SATURDAYS"),
 ("sports", "WEEKLY CLUB", "AMERICAN SPACE", "SPORTS", "SATURDAYS"),
 ("discover-africa", "WEEKLY CLUB", "DISCOVER", "AFRICA", "SUNDAYS"),
 ("psychology", "BIWEEKLY CLUB", "", "PSYCHOLOGY", "EVERY OTHER SUNDAY"),
 ("english-reading", "WEEKLY CLUB", "ENGLISH", "READING", "SUNDAYS"),
]
if __name__ == "__main__":
    ims = [cover(*c) for c in LIST]
    t, gp = 300, 24
    sheet = Image.new("RGB", (4 * t + 5 * gp, 2 * t + 3 * gp), (22, 22, 22))
    for i, s_ in enumerate(ims):
        sheet.paste(s_.resize((t, t), Image.LANCZOS), (gp + (i % 4) * (t + gp), gp + (i // 4) * (t + gp)))
    sheet.save(FINAL + "/club-covers-sheet.png"); print("FIN")
