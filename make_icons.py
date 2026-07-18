#!/usr/bin/env python3
"""Generate Mad Scientist Maker PWA icons (192 + 512) — a beaker on dark lab bg.
Pure Pillow, no external assets. Run: python3 make_icons.py"""
import math
from PIL import Image, ImageDraw

BG = (11, 14, 20)          # #0b0e14 lab dark
ACCENT = (70, 232, 138)    # #46e88a acid green
CYAN = (76, 201, 240)      # #4cc9f0

def make_icon(size):
    img = Image.new("RGBA", (size, size), BG + (255,))
    d = ImageDraw.Draw(img)
    s = size
    # Beaker: a rounded flask in the center.
    cx = s * 0.5
    top_y = s * 0.22
    neck_w = s * 0.16
    body_top = s * 0.40
    body_w = s * 0.52
    bottom_y = s * 0.80
    r = s * 0.06  # corner radius of the flask body

    # Flask outline polygon (neck + tapered body), drawn as a thick rounded stroke.
    pts = [
        (cx - neck_w/2, top_y),
        (cx - neck_w/2, body_top),
        (cx - body_w/2, bottom_y - r),
        (cx + body_w/2, bottom_y - r),
        (cx + neck_w/2, body_top),
        (cx + neck_w/2, top_y),
    ]
    # Draw body as a filled rounded shape with a "liquid" fill + outline.
    # We'll draw an outline polygon (slightly thick) then a liquid level.
    lw = max(3, int(s * 0.022))
    d.line(pts + [pts[0]], fill=ACCENT + (255,), width=lw, joint="curve")

    # Liquid: a clipped region near the bottom using a polygon and a chord.
    liquid_top = s * 0.60
    liq = [
        (cx - body_w/2 + lw, liquid_top),
        (cx + body_w/2 - lw, liquid_top),
        (cx + body_w/2 - lw, bottom_y - r),
        (cx - body_w/2 + lw, bottom_y - r),
    ]
    # bubble accents
    d.polygon(liq, fill=CYAN + (90,))
    # a couple of bubbles
    for (bx, by, br) in [(cx - s*0.10, s*0.68, s*0.025),
                          (cx + s*0.07, s*0.72, s*0.018),
                          (cx + s*0.0,  s*0.66, s*0.014)]:
        d.ellipse([bx-br, by-br, bx+br, by+br], fill=ACCENT + (200,))

    # A small "+" spark over the flask neck (mad-scientist vibe)
    spark_y = s * 0.16
    spark_x = cx + s*0.20
    sl = s * 0.05
    d.line([(spark_x - sl, spark_y), (spark_x + sl, spark_y)], fill=ACCENT + (255,), width=lw)
    d.line([(spark_x, spark_y - sl), (spark_x, spark_y + sl)], fill=ACCENT + (255,), width=lw)

    return img

for sz in (192, 512):
    make_icon(sz).save(f"/home/toby/projects/mad-scientist-maker/icon-{sz}.png")
    print("wrote icon", sz)

# Apple touch icon: 180x180, opaque (iOS masks corners itself). Same beaker art.
make_icon(180).convert("RGBA").save("/home/toby/projects/mad-scientist-maker/apple-touch-icon.png")
print("wrote apple-touch-icon 180")
