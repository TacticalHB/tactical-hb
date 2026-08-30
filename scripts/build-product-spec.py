#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build Tactical_HB_Product_Specifications.pdf from the site's own catalogue.

    npm run dev                          # in one terminal
    python3 scripts/build-product-spec.py

WHY THIS EXISTS, and it is the same reason build-price-list.py exists: a
printed sheet that restates what lib/products.ts already holds is wrong the
first time a spec changes. This reads /api/dev/product-specs and lays it out,
so the document cannot disagree with the website.

WHAT IT REFUSES TO DO IS INVENT. Where the catalogue has no value, the sheet
prints "not specified" — it never borrows a figure from a similar product and
never converts one unit into a claim about another. Most visibly: NOTHING in
the catalogue states a maximum working temperature, so nothing here does.
"""

import json
import os
import sys
import urllib.request
from datetime import date

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

SOURCE = os.environ.get("SPEC_SOURCE", "http://localhost:3000/api/dev/product-specs")
OUT = os.environ.get(
    "SPEC_OUT",
    os.path.expanduser(
        "~/Library/CloudStorage/OneDrive-LiverpoolJohnMooresUniversity/"
        "tct project/Tactical_HB_Product_Specifications.pdf"
    ),
)

# Arial carries the hryvnia and euro signs and the dashes this copy uses.
# Helvetica, which ReportLab ships with, mangles them.
FONTS = {
    "THB": "/System/Library/Fonts/Supplemental/Arial.ttf",
    "THB-Bold": "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "THB-Italic": "/System/Library/Fonts/Supplemental/Arial Italic.ttf",
}

INK = HexColor("#1A1915")
MUTED = HexColor("#6B6862")
FAINT = HexColor("#98948C")
LINE = HexColor("#E7E3DC")
# The packaging orange, deep weight — this is a light page. See the house rule:
# one accent, two weights, bright on dark and deep on light.
ACCENT = HexColor("#C45A1A")

W, H = A4
LEFT, RIGHT = 52, W - 52
TOP = H - 62
FOOTER_Y = 40
FLOOR = FOOTER_Y + 24
COL = RIGHT - LEFT

CATEGORY = {
    "hmd": "Heat management device",
    "bowl": "Tobacco bowl",
    "windcover": "Wind cover",
    "accessory": "Accessory",
    "hookah": "Hookah",
}


def register_fonts():
    for name, path in FONTS.items():
        if not os.path.exists(path):
            sys.exit(f"Missing font: {path}")
        pdfmetrics.registerFont(TTFont(name, path))


def fetch():
    try:
        with urllib.request.urlopen(SOURCE, timeout=10) as r:
            return json.load(r)
    except Exception as e:
        sys.exit(f"Could not read {SOURCE} — is `npm run dev` running?  ({e})")


def money(eur, uah):
    """Both currencies, hand-set independently — never one converted."""
    return f"€{eur:.2f}   /   ₴{uah:,.0f}".replace(",", " ")


class Doc:
    """A canvas with a cursor, so a section can simply ask for space.

    Every writer goes through `need()`, which is the only place a page break
    happens. That is what keeps a heading from stranding itself at the foot of
    a page with its table overleaf.
    """

    def __init__(self, c):
        self.c = c
        self.y = TOP
        self.page = 1

    def need(self, h):
        if self.y - h < FLOOR:
            self.footer()
            self.c.showPage()
            self.page += 1
            self.y = TOP

    def footer(self):
        c = self.c
        c.setStrokeColor(LINE)
        c.setLineWidth(0.5)
        c.line(LEFT, FOOTER_Y + 12, RIGHT, FOOTER_Y + 12)
        c.setFont("THB", 7.5)
        c.setFillColor(FAINT)
        c.drawString(LEFT, FOOTER_Y, "TACTICAL HB  ·  tactical-hb.com")
        c.drawRightString(RIGHT, FOOTER_Y, str(self.page))

    def wrap(self, text, font, size, width):
        words, lines, cur = text.split(), [], ""
        for w in words:
            trial = f"{cur} {w}".strip()
            if pdfmetrics.stringWidth(trial, font, size) <= width:
                cur = trial
            else:
                if cur:
                    lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        return lines

    def para(self, text, font="THB", size=9.5, colour=MUTED, lead=13.5, indent=0, width=None):
        width = width or (COL - indent)
        for ln in self.wrap(text, font, size, width):
            self.need(lead)
            self.c.setFont(font, size)
            self.c.setFillColor(colour)
            self.c.drawString(LEFT + indent, self.y, ln)
            self.y -= lead

    def gap(self, h):
        self.y -= h

    def rule(self, colour=LINE, width=0.5):
        self.need(8)
        self.c.setStrokeColor(colour)
        self.c.setLineWidth(width)
        self.c.line(LEFT, self.y, RIGHT, self.y)
        self.y -= 8

    def label(self, text):
        """A small caps-tracked section marker, the site's own device."""
        self.need(20)
        self.c.setFont("THB-Bold", 7.5)
        self.c.setFillColor(ACCENT)
        self.c.drawString(LEFT, self.y, " ".join(text.upper()))
        self.y -= 14

    def row(self, label, value, indent=0):
        """One line of the specification table."""
        lab_w = 132
        lines = self.wrap(value, "THB", 9.5, COL - lab_w - indent)
        self.need(max(13.5, 13.5 * len(lines)))
        self.c.setFont("THB", 9.5)
        self.c.setFillColor(FAINT)
        self.c.drawString(LEFT + indent, self.y, label)
        self.c.setFillColor(INK)
        y = self.y
        for ln in lines:
            self.c.drawString(LEFT + indent + lab_w, y, ln)
            y -= 13.5
        self.y = y

    def bullet(self, text):
        lines = self.wrap(text, "THB", 9.5, COL - 14)
        self.need(13.5 * len(lines))
        self.c.setFont("THB", 9.5)
        for i, ln in enumerate(lines):
            if i == 0:
                self.c.setFillColor(ACCENT)
                self.c.drawString(LEFT, self.y, "—")
            self.c.setFillColor(MUTED)
            self.c.drawString(LEFT + 14, self.y, ln)
            self.y -= 13.5


def wordmark(d, y):
    """TACTICAL in ink, HB in the accent — one lockup, as everywhere else."""
    c = d.c
    # Tracking lives on a TEXT OBJECT, not the canvas — canvas.setCharSpace
    # does not exist.
    # The wide-tracked TACTICAL is the lockup the site uses, so it is worth
    # the extra object rather than settling for flat text.
    track = 3.2
    t = c.beginText(LEFT, y)
    t.setFont("THB-Bold", 15)
    t.setCharSpace(track)
    t.setFillColor(INK)
    t.textOut("TACTICAL")
    # HB sits at its own tracking so the two words read as one lockup.
    t.setFillColor(ACCENT)
    t.textOut(" HB")
    # AND PUT IT BACK. A text object's char spacing is written into the canvas
    # graphics state and SURVIVES drawText — leave it set and every paragraph
    # in the document renders wide, overflowing the margin, because wrap()
    # measures with stringWidth() which knows nothing about it. The first
    # build of this file did exactly that on all eight pages.
    t.setCharSpace(0)
    c.drawText(t)


def cover(d, count):
    c = d.c
    wordmark(d, H - 70)
    d.y = H - 140

    c.setFont("THB-Bold", 26)
    c.setFillColor(INK)
    c.drawString(LEFT, d.y, "Product Specifications")
    d.y -= 26
    c.setFont("THB", 11)
    c.setFillColor(MUTED)
    c.drawString(LEFT, d.y, f"The full catalogue — {count} listings")
    d.y -= 16
    c.setFont("THB", 9)
    c.setFillColor(FAINT)
    c.drawString(LEFT, d.y, date.today().strftime("%d %B %Y"))
    d.y -= 30
    d.rule(ACCENT, 1.2)
    d.gap(14)

    d.label("About this document")
    d.para(
        "Every figure here is generated from the website's own catalogue rather than "
        "transcribed beside it, so this sheet and tactical-hb.com cannot disagree. "
        "Materials, finishes, weights, dimensions and prices are the same values the "
        "product pages serve.",
        lead=13.5,
    )
    d.gap(8)
    d.para(
        "Retail prices are shown in euro and hryvnia. Neither is a conversion of the "
        "other — the two lists are set independently, and the same is true of the "
        "trade prices, which are quoted per price book.",
    )
    d.gap(14)

    d.label("What this document does not state")
    d.para(
        "MAXIMUM WORKING TEMPERATURE IS NOT SPECIFIED ANYWHERE IN THE CATALOGUE, "
        "for any product, so it is not stated here. These devices are built to hold "
        "and distribute the heat of lit charcoal, and the product copy describes that "
        "behaviour — even heat, no extreme swings — but no rated figure in degrees "
        "has ever been recorded. Printing one would mean inventing it, and a thermal "
        "rating on a document a trade buyer may rely on is not a thing to estimate. "
        "Every specification table below carries the line so the gap is visible.",
        font="THB",
        colour=INK,
    )
    d.gap(8)
    d.para(
        "Two other silences worth naming: the FEAR 9E418 ring and the LID 9E418 have "
        "no material recorded, and the withheld listing at the end has no data at all "
        "by design.",
    )

    d.footer()
    c.showPage()
    d.page += 1
    d.y = TOP


def product(d, p):
    c = d.c
    # RESERVE ENOUGH FOR THE PRODUCT TO BEGIN PROPERLY. A smaller reserve fits
    # the heading and then breaks in the middle of the specification table —
    # the first build put "HMD A.Craft", its tagline, its purpose and exactly
    # one spec row at the foot of page 2. A section that starts must get far
    # enough in to be worth starting.
    d.need(300)

    # ---- Heading -----------------------------------------------------------
    c.setFont("THB-Bold", 16)
    c.setFillColor(INK)
    c.drawString(LEFT, d.y, p["name"])
    c.setFont("THB", 8)
    c.setFillColor(FAINT)
    # THE WITHHELD LISTING DOES NOT NAME ITS CATEGORY. Its category is
    # "hookah", and the whole point of the listing is that nobody is told what
    # is coming — the word was stripped from the product page and the flagship
    # page for that reason, and a spec sheet is not the place to put it back.
    c.drawRightString(RIGHT, d.y, "WITHHELD" if p["incoming"] else CATEGORY.get(p["category"], p["category"]).upper())
    d.y -= 15

    if p["tagline"]:
        c.setFont("THB-Italic", 10)
        c.setFillColor(ACCENT)
        c.drawString(LEFT, d.y, p["tagline"])
        d.y -= 14

    d.rule()
    d.gap(4)

    # ---- Purpose -----------------------------------------------------------
    body = p["short"] or p["description"]
    if body:
        d.label("Purpose")
        d.para(body)
        d.gap(10)

    # ---- Specification -----------------------------------------------------
    # Nothing is published about the withheld listing, so it gets a sentence
    # rather than a table with one row in it saying "not specified".
    if p["incoming"]:
        d.para(
            "No specification is published for this listing. It exists as a page, "
            "not yet as a product.",
            font="THB-Italic",
        )
        d.gap(12)
        d.rule(LINE, 0.5)
        d.gap(14)
        return

    d.label("Specification")
    for s in p["specs"]:
        d.row(s["label"], s["value"])

    # ONLY IF THE CATALOGUE HAS NOT ALREADY SAID IT. Several products carry
    # their own "Colours" spec row, and printing a derived one beside it gave
    # HMD TCT OP two colour lines that said the same thing twice.
    said_colours = any("colour" in s["label"].lower() for s in p["specs"])
    if p["colours"] and not said_colours:
        d.row("Colours", ", ".join(v["name"] for v in p["colours"]))
    elif p["colourShown"] and not said_colours:
        d.row("Finish shown", p["colourShown"])

    if p["weightG"]:
        w = f"{p['weightG']} g"
        if p["lidWeightG"]:
            w += f"  (device only — the optional lid adds {p['lidWeightG']} g)"
        d.row("Weight", w)

    dm = p["dims"]
    if dm["l"] or dm["w"] or dm["h"]:
        d.row("Packed size", f"{dm['l']} × {dm['w']} × {dm['h']} mm")

    # THE HONEST BLANK. Printed on every product for the same reason it is on
    # the cover: a missing row reads as an oversight, a stated absence reads as
    # a fact about the catalogue.
    d.row("Max. temperature", "not specified")

    if not p["incoming"]:
        # A PRODUCT SOLD AT TWO PRICES IS QUOTED AT TWO PRICES. Where the
        # colours are priced apart — HMD TCT OP is €30 black, €32 purple —
        # one figure for the product would be wrong for one of them.
        priced_apart = len({(v["priceEur"], v["priceUah"]) for v in p["colours"]}) > 1
        if priced_apart:
            for v in p["colours"]:
                d.row(f"Retail — {v['name']}", money(v["priceEur"], v["priceUah"]))
        else:
            d.row("Retail", money(p["priceEur"], p["priceUah"]))

        for book, label in (("tradeShop", "shop"), ("tradeLounge", "lounge")):
            per = [v for v in p["colours"] if v[book]]
            distinct = {(v[book]["eur"], v[book]["uah"]) for v in per}
            if len(distinct) > 1:
                for v in per:
                    d.row(f"Trade {label} — {v['name']}", money(v[book]["eur"], v[book]["uah"]))
            elif p[book]:
                d.row(f"Trade — {label}", money(p[book]["eur"], p[book]["uah"]))
    d.gap(12)

    # ---- How it works ------------------------------------------------------
    if p["features"]:
        d.label("How it works")
        for f in p["features"]:
            lines = d.wrap(f"{f['title']} — {f['text']}", "THB", 9.5, COL - 14)
            d.need(13.5 * len(lines))
            for i, ln in enumerate(lines):
                if i == 0:
                    c.setFillColor(ACCENT)
                    c.setFont("THB", 9.5)
                    c.drawString(LEFT, d.y, "—")
                c.setFont("THB", 9.5)
                c.setFillColor(MUTED)
                c.drawString(LEFT + 14, d.y, ln)
                d.y -= 13.5
            d.gap(3)
        d.gap(9)

    if p["benefits"]:
        d.label("In use")
        for b in p["benefits"]:
            d.bullet(b)
        d.gap(9)

    if p["tips"]:
        d.label("Care and handling")
        for t in p["tips"]:
            d.bullet(t)
        d.gap(9)

    if p["statement"]:
        d.para(p["statement"], font="THB-Italic", size=10, colour=INK, lead=14)
        d.gap(9)

    d.gap(6)
    d.rule(LINE, 0.5)
    d.gap(14)


def main():
    register_fonts()
    data = fetch()
    items = data["products"]

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle("Tactical HB — Product Specifications")
    c.setAuthor("Tactical HB")

    d = Doc(c)
    cover(d, len(items))

    # Sellable first, the withheld listing last — it is a page on the site, so
    # it belongs in a document about the site, but it is not a product yet.
    order = [p for p in items if not p["incoming"]] + [p for p in items if p["incoming"]]
    for p in order:
        product(d, p)

    d.footer()
    c.save()
    print(f"Wrote {OUT}  ({d.page} pages, {len(items)} products)")


if __name__ == "__main__":
    main()
