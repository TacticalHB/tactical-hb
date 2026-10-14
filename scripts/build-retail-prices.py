#!/usr/bin/env python3
"""
The retail price list PDFs for the wholesale portal's "Retail prices" tab.

    npm run dev                                   # the source is a dev route
    python3 scripts/build-retail-prices.py

Writes private/wholesale/retail-prices-uah.pdf (Ukrainian, hryvnia),
private/wholesale/retail-prices-eur.pdf (English, euro) and
private/wholesale/retail-prices.json — the prices the PDFs were built from.
test/retail-reference.test.ts compares that JSON with the catalogue, so a
retail repricing that forgets to rerun this fails the tests instead of
shipping a stale PDF.

THE ROWS ARE THE PORTAL'S OWN (/api/dev/retail-prices → lib/retail-reference),
so the download and the tab beside it cannot disagree.

LIGHT ON PURPOSE (Mario, 14 Oct 2026: the first draft was "way too dark"). No
product photos — every product is black, and a column of black thumbnails
read as a dark page. Regular weights, faint hairlines, the orange only on the
section labels and the rule under the wordmark.
"""
import datetime
import json
import os
import sys
import urllib.request

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.environ.get("RETAIL_SOURCE", "http://localhost:3000/api/dev/retail-prices")
OUT_DIR = os.path.join(ROOT, "private", "wholesale")

# Arial carries Cyrillic, ₴ and €; ReportLab's Helvetica carries none of the first.
FONTS = {
    "THB": "/System/Library/Fonts/Supplemental/Arial.ttf",
    "THB-Bold": "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
}

INK = HexColor("#2B2A27")
MUTED = HexColor("#7A776F")
FAINT = HexColor("#A6A29A")
LINE = HexColor("#EEEBE6")
ACCENT = HexColor("#C45A1A")

W, H = A4
LEFT, RIGHT = 56, W - 56
FOOTER_Y = 40
FLOOR = FOOTER_Y + 24
ROW = 22  # baseline to baseline

MONTHS_UK = ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня",
             "серпня", "вересня", "жовтня", "листопада", "грудня"]

COPY = {
    "uah": {
        "rail": "Роздрібні ціни · UAH",
        "title": "Роздрібні ціни",
        "sub": lambda d: "Ціни на tactical-hb.com для покупців в Україні · станом на %d %s %d" % (d.day, MONTHS_UK[d.month - 1], d.year),
        "cats": {"hookah": "КАЛЬЯНИ", "bowl": "ЧАШІ", "hmd": "ПРИСТРОЇ НАГРІВУ", "windcover": "КОВПАКИ", "accessory": "АКСЕСУАРИ"},
        "timer": "Таймер — додається до ковпака",
        "colours": {"Black": "Чорний", "Purple": "Фіолетовий"},
        "note": "Для орієнтиру. Ваші оптові ціни — у порталі партнера.",
    },
    "eur": {
        "rail": "Retail prices · EUR",
        "title": "Retail prices",
        "sub": lambda d: "Prices on tactical-hb.com for customers outside Ukraine · as of %d %s %d" % (d.day, d.strftime("%B"), d.year),
        "cats": {"hookah": "HOOKAHS", "bowl": "BOWLS", "hmd": "HEAT DEVICES", "windcover": "WIND COVERS", "accessory": "ACCESSORIES"},
        "timer": "Timer — added to a wind cover",
        "colours": {"Black": "Black", "Purple": "Purple"},
        "note": "For reference. Your trade prices are in the partner portal.",
    },
}

SALES = "sales@tactical-hb.com"  # mirrors SALES_EMAIL in lib/contact-info.ts


def fetch():
    try:
        with urllib.request.urlopen(SOURCE, timeout=60) as r:
            return json.loads(r.read().decode("utf-8"))["rows"]
    except Exception as exc:  # noqa: BLE001
        sys.exit("Could not read %s\n  %s\n\nStart the dev server first: npm run dev" % (SOURCE, exc))


def money(v, cur):
    if cur == "uah":
        return "₴" + "{:,}".format(int(round(v))).replace(",", " ")
    return "€%.2f" % v


def page(c, rows, cur, today):
    t = COPY[cur]
    y = H - 58
    c.setFont("THB-Bold", 12.5)
    c.setFillColor(INK)
    c.drawString(LEFT, y, "TACTICAL ")
    c.setFillColor(ACCENT)
    c.drawString(LEFT + c.stringWidth("TACTICAL ", "THB-Bold", 12.5), y, "HB")
    c.setFont("THB", 8.5)
    c.setFillColor(FAINT)
    c.drawRightString(RIGHT, y, t["rail"])

    y -= 26
    c.setStrokeColor(ACCENT)
    c.setLineWidth(1)
    c.line(LEFT, y, LEFT + 36, y)
    y -= 30
    c.setFont("THB", 22)
    c.setFillColor(INK)
    c.drawString(LEFT, y, t["title"])
    y -= 17
    c.setFont("THB", 9)
    c.setFillColor(MUTED)
    c.drawString(LEFT, y, t["sub"](today))
    y -= 14

    last = None
    for r in rows:
        if r["category"] != last:
            y -= 22
            c.setFont("THB", 7.5)
            c.setFillColor(ACCENT)
            c.drawString(LEFT, y, " ".join(t["cats"][r["category"]]))  # letter-spaced
            last = r["category"]
            y -= 4
        y -= ROW
        c.setStrokeColor(LINE)
        c.setLineWidth(0.5)
        c.line(LEFT, y + ROW - 6, RIGHT, y + ROW - 6)
        price = money(r["price"][cur], cur)
        if r.get("addon") == "timer":
            c.setFont("THB", 10)
            c.setFillColor(MUTED)
            c.drawString(LEFT, y + 4, t["timer"])
            c.drawRightString(RIGHT, y + 4, "+" + price)
            continue
        c.setFont("THB", 10.5)
        c.setFillColor(INK)
        c.drawString(LEFT, y + 4, r["name"])
        if r.get("colour"):
            c.setFillColor(FAINT)
            c.drawString(LEFT + c.stringWidth(r["name"] + "  ", "THB", 10.5), y + 4,
                         "· " + t["colours"].get(r["colour"], r["colour"]))
        c.setFillColor(INK)
        c.drawRightString(RIGHT, y + 4, price)

    y -= 30
    c.setFont("THB", 8.5)
    c.setFillColor(FAINT)
    c.drawString(LEFT, y, t["note"])

    c.setFont("THB", 8)
    c.drawString(LEFT, FOOTER_Y, "tactical-hb.com")
    c.drawRightString(RIGHT, FOOTER_Y, SALES)
    if y < FLOOR:
        raise SystemExit("The %s page overflows (last line at %.0fpt, floor %dpt) — tighten ROW." % (cur, y, FLOOR))


def main():
    for name, path in FONTS.items():
        if not os.path.exists(path):
            sys.exit("Missing font: %s" % path)
        pdfmetrics.registerFont(TTFont(name, path))
    rows = fetch()
    today = datetime.date.today()
    os.makedirs(OUT_DIR, exist_ok=True)
    for cur in ("uah", "eur"):
        out = os.path.join(OUT_DIR, "retail-prices-%s.pdf" % cur)
        c = canvas.Canvas(out, pagesize=A4)
        c.setTitle("Tactical HB — " + COPY[cur]["title"])
        c.setAuthor("Tactical HB")
        page(c, rows, cur, today)
        c.showPage()
        c.save()
        print("wrote %s" % out)
    snapshot = [{"key": r["key"], "eur": r["price"]["eur"], "uah": r["price"]["uah"]} for r in rows]
    with open(os.path.join(OUT_DIR, "retail-prices.json"), "w") as f:
        json.dump({"built": today.isoformat(), "rows": snapshot}, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("wrote retail-prices.json (%d rows)" % len(snapshot))


if __name__ == "__main__":
    main()
