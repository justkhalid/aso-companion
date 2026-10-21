"""Glass light-streak edge effect, modeled on the Real Madrid posters:
long curved streaks smeared along the frame, bright glints with trailing
streaks, rainbow fringes on the highlights."""
import numpy as np
from scipy.ndimage import map_coordinates, zoom, gaussian_filter
from PIL import Image

W, H = 1080, 1920
SC = 0.5  # work at half resolution
w, h = int(W * SC), int(H * SC)
CX, CY = w / 2, h / 2
R = 540 * SC


def _smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def _lic(noise, pert, L=42, step=2.0):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    acc = noise.copy()
    cnt = 1
    for sign in (1, -1):
        px, py = xx.copy(), yy.copy()
        for _ in range(L):
            ang = np.arctan2(py - CY, px - CX) + np.pi / 2 + map_coordinates(pert, [py, px], order=1, mode="nearest")
            px = px + sign * np.cos(ang) * step
            py = py + sign * np.sin(ang) * step
            acc += map_coordinates(noise, [py, px], order=1, mode="reflect")
            cnt += 1
    return acc / cnt


def build_fields(seed=7, strength=1.0):
    rng = np.random.default_rng(seed)
    low = rng.standard_normal((9, 5)).astype(np.float32)
    pert = zoom(low, (h / 9, w / 5), order=3)[:h, :w] * 0.20
    pert = np.pad(pert, ((0, h - pert.shape[0]), (0, w - pert.shape[1])), mode="edge")

    fine = rng.random((h, w)).astype(np.float32)
    coarse = gaussian_filter(rng.random((h, w)).astype(np.float32), 2.6)
    f = _lic(fine, pert)
    c = _lic(coarse, pert)
    f = (f - f.mean()) / (f.std() + 1e-6)
    c = (c - c.mean()) / (c.std() + 1e-6)
    tex = np.clip(0.46 + 0.30 * f + 0.48 * c, 0, 1) ** 3.0

    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dx, dy = xx - CX, yy - CY
    r = np.hypot(dx, dy)
    phi = np.arctan2(dy, dx)

    def angdiff(a, b):
        d = a - b
        return (d + np.pi) % (2 * np.pi) - np.pi

    a1, a2 = np.deg2rad(-42), np.deg2rad(138)
    wgt = 0.03 + 0.97 * np.maximum(np.exp(-(angdiff(phi, a1) / 0.50) ** 2), np.exp(-(angdiff(phi, a2) / 0.58) ** 2))
    m_rad = _smooth(r, R * 0.80, R * 1.03)
    alpha = m_rad * wgt

    I = tex * alpha

    # glints: bright blobs elongated along the tangent, with the streaks trailing them
    blobs = np.zeros((h, w), np.float32)
    for ang, rr, su, sv, amp in [(-50, 0.93, 46, 7, 1.0), (-32, 0.97, 26, 5, 0.7), (141, 0.90, 52, 8, 0.9)]:
        a = np.deg2rad(ang)
        bx, by = CX + np.cos(a) * R * rr, CY + np.sin(a) * R * rr
        tx, ty = -np.sin(a), np.cos(a)
        u = (xx - bx) * tx + (yy - by) * ty
        v = (xx - bx) * np.cos(a) + (yy - by) * np.sin(a)
        blobs += amp * np.exp(-(u / su) ** 2 - (v / sv) ** 2)
    blobs = np.clip(blobs, 0, 1)
    I = gaussian_filter(np.clip(I * strength, 0, 1), 0.9)
    I = np.clip(I + 0.9 * blobs, 0, 1)

    # rainbow fringe: shift channels radially
    ux, uy = np.cos(phi), np.sin(phi)
    out = []
    for s in (1.7, 0.0, -1.7):  # R outward, G centered, B inward
        out.append(map_coordinates(I, [yy + uy * s, xx + ux * s], order=1, mode="nearest"))
    up = lambda a: np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), dtype=np.float32) / 255
    Ir, Ig, Ib = (up(a) for a in out)
    blob_full = up(blobs)
    return Ir, Ig, Ib, blob_full, up(alpha)


def apply_dark(img_rgb, fields, tint=(0.70, 0.80, 1.0), k=0.80):
    Ir, Ig, Ib, blob, _ = fields
    base = np.asarray(img_rgb, np.float32) / 255
    add = np.stack([Ir * tint[0], Ig * tint[1], Ib * tint[2]], -1) * k
    out = 1 - (1 - base) * (1 - np.clip(add, 0, 1))
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))


def apply_light(img_rgb, fields, tint=(0.40, 0.48, 0.74), k=0.38):
    Ir, Ig, Ib, blob, _ = fields
    base = np.asarray(img_rgb, np.float32) / 255
    s = np.stack([Ir, Ig, Ib], -1) * k
    t = np.array(tint, np.float32)[None, None, :]
    out = base * (1 - s * (1 - t))
    # glints stay bright over the darkened glass
    out = out + (blob[..., None] ** 1.5) * 0.55 * np.array([1.0, 0.98, 0.96], np.float32)[None, None, :]
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))
