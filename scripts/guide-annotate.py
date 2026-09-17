#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Draw the callout rings and numbers onto the captured screens."""

import json
import os
from PIL import Image, ImageDraw, ImageFont

SCALE = 2                      # the captures are deviceScaleFactor 2
ACCENT = (196, 90, 26, 255)    # the deep packaging orange, for ink on light
RING_W = 5 * SCALE
PAD = 7 * SCALE

FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


def ring(draw, box, n, font, badge_side="right"):
    """A rounded ring around the target, with a numbered disc beside it."""
    x, y = box["x"] * SCALE, box["y"] * SCALE
    w, h = box["width"] * SCALE, box["height"] * SCALE
    r = [x - PAD, y - PAD, x + w + PAD, y + h + PAD]
    draw.rounded_rectangle(r, radius=12 * SCALE, outline=ACCENT, width=RING_W)

    # The disc sits OUTSIDE the ring so it never covers the thing it points at
    # — and "outside" depends on which way the neighbours run. Beside a
    # full-width form field there is empty margin to the right; in a horizontal
    # nav bar that space belongs to the next link, and the first attempt put
    # the "1" squarely on top of ABOUT. Below, there.
    d = 30 * SCALE
    if badge_side == "below":
        cx = x + w / 2 - d / 2
        cy = r[3] + 10 * SCALE
    else:
        cx = r[2] + 14 * SCALE
        cy = y + h / 2 - d / 2
    draw.ellipse([cx, cy, cx + d, cy + d], fill=ACCENT)
    tw = draw.textbbox((0, 0), str(n), font=font)
    draw.text(
        (cx + d / 2 - (tw[2] - tw[0]) / 2, cy + d / 2 - (tw[3] - tw[1]) / 2 - tw[1]),
        str(n), font=font, fill=(255, 255, 255, 255),
    )


BADGE_SIDE = {("01-nav", "wholesale"): "below"}


def main(locale):
    boxes = json.load(open(f"boxes-{locale}.json"))
    src = f"shots-{locale}"
    dst = f"annotated-{locale}"
    os.makedirs(dst, exist_ok=True)
    font = ImageFont.truetype(FONT_BOLD, 17 * SCALE)

    # Which callouts go on which screen, and their numbers in the guide.
    plan = {
        "01-nav": [("wholesale", 1)],
        "02-wholesale": [("register", 2)],
        "03-email": [("email", 3), ("send", 4)],
        "04-details": [("code", 5), ("company", 6)],
        "05-details-lower": [("type", 7), ("password", 8), ("submit", 9)],
        "06-done": [],
    }

    for shot, targets in plan.items():
        im = Image.open(f"{src}/{shot}.png").convert("RGBA")
        layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer)
        found = {t["label"]: t["box"] for t in boxes.get(shot, []) if t["box"]}
        for label, n in targets:
            b = found.get(label)
            if not b:
                print(f"  !! {shot}: no box for {label}")
                continue
            ring(draw, b, n, font, badge_side=BADGE_SIDE.get((shot, label), "right"))
        out_im = Image.alpha_composite(im, layer).convert("RGB")

        # CROPPED TO WHERE THE ACTION IS. Every capture is a full 1280x860
        # viewport and most of the lower half is empty page — printed whole,
        # each step would be a postage stamp of UI floating in a field of
        # cream. The nav bar is always kept: it is how a reader knows which
        # page they are looking at.
        bottoms = [ (b["y"] + b["height"]) for b in found.values() ]
        cut = int((max(bottoms) + 90) * SCALE) if bottoms else int(420 * SCALE)
        out_im.crop((0, 0, out_im.width, min(cut, out_im.height))).save(f"{dst}/{shot}.png")
        print("annotated", shot, [t[0] for t in targets])


for loc in ("en", "uk"):
    print(f"--- {loc} ---")
    main(loc)
