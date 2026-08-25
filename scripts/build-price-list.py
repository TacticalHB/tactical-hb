#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rebuild Tactical_HB_Wholesale_Price_List.pdf from the code's own price book.

    npm run dev                        # in one terminal
    python3 scripts/build-price-list.py

WHY THIS EXISTS. The printed list and lib/wholesale-prices disagreed within a
day of the first repricing, and again after the second, because they were two
copies of the same numbers kept by hand. The portal charges from the code, so
the code is what the document has to be generated from — this script reads
/api/dev/price-list and lays the result out. Reprice in one place, run this,
and the PDF cannot be stale.

Two pages, as before: euro for export, hryvnia for Ukraine.
"""

import json
import os
import sys
import urllib.request

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

SOURCE = os.environ.get("PRICE_LIST_SOURCE", "http://localhost:3000/api/dev/price-list")
OUT = os.environ.get(
    "PRICE_LIST_OUT",
    os.path.expanduser(
        "~/Library/CloudStorage/OneDrive-LiverpoolJohnMooresUniversity/"
        "tct project/Tactical_HB_Wholesale_Price_List.pdf"
    ),
)

# Arial carries Cyrillic, the hryvnia sign and the euro sign. Helvetica, which
# ReportLab ships with, carries none of the first and mangles page two.
FONTS = {
    "THB": "/System/Library/Fonts/Supplemental/Arial.ttf",
    "THB-Bold": "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
}

INK = HexColor("#1A1915")
MUTED = HexColor("#6B6862")
FAINT = HexColor("#98948C")
LINE = HexColor("#E7E3DC")
ACCENT = HexColor("#C45A1A")

W, H = A4
LEFT, RIGHT = 48, W - 48
FOOTER_Y = 40
# The lowest a line of body copy may sit before it starts fighting the footer.
FLOOR = FOOTER_Y + 18
ROW = 18  # One table row, baseline to baseline.


def register_fonts():
    for name, path in FONTS.items():
        if not os.path.exists(path):
            sys.exit("Missing font: %s" % path)
        pdfmetrics.registerFont(TTFont(name, path))


def fetch():
    try:
        with urllib.request.urlopen(SOURCE, timeout=20) as r:
            return json.loads(r.read().decode("utf-8"))["books"]
    except Exception as exc:  # noqa: BLE001 — the message is the whole point
        sys.exit(
            "Could not read %s\n  %s\n\nStart the dev server first: npm run dev" % (SOURCE, exc)
        )


COPY = {
    "eur": {
        "rail": "Price list · EUR",
        "title": "Wholesale price list",
        "sub": "Export · EUR  ·  Two partner books: Shop / Distribution and Lounge",
        "unit": "EUR",
        "product": "PRODUCT",
        "books": [
            ("SHOP / DISTRIBUTION", "Wholesale book for specialty shops, online retailers and distributors"),
            ("LOUNGE / BAR", "Partner book for shisha lounges and bars"),
        ],
        "note": "Unit prices in euro. Add-ons (Lid 9E418, FEAR 9E418) are listed separately.",
        "terms_title": "Terms",
        "terms": [
            "Prices apply only to approved wholesale partners. Access is granted after application review.",
            "Orders are submitted as quantity requests in the trade portal — nothing is charged on the website.",
            "Payment details are confirmed by email. Prices exclude shipping unless otherwise agreed.",
            "Tactical HB reserves the right to update this list. Confidential — do not redistribute.",
        ],
        "footer": "Confidential — for approved partners only  ·  tactical-hb.com",
    },
    "uah": {
        "rail": "Price list · UAH",
        "title": "Оптовий прайс-лист",
        "sub": "Україна · UAH  ·  Два прайси: Магазин / Дистрибуція та Кальянна",
        "unit": "UAH",
        "product": "ТОВАР",
        "books": [
            ("SHOP / DISTRIBUTION · МАГАЗИН",
             "Прайс для спеціалізованих магазинів, онлайн-рітейлу та дистриб'юторів"),
            ("LOUNGE / BAR · КАЛЬЯННА",
             "Прайс для кальянних та барів"),
        ],
        "note": "Ціни за одиницю в гривні. Додатки (Lid 9E418, FEAR 9E418) вказано окремо.",
        "terms_title": "Умови",
        "terms": [
            "Ціни діють лише для схвалених оптових партнерів. Доступ — після розгляду заявки.",
            "Замовлення надсилаються як запити на кількість у порталі — на сайті нічого не списується.",
            "Реквізити для оплати підтверджуємо листом. Ціни без вартості доставки, якщо не погоджено інакше.",
            "Tactical HB має право оновлювати цей прайс. Конфіденційно — не розповсюджувати.",
        ],
        "footer": "Confidential — for approved partners only  ·  tactical-hb.com",
    },
}

SALES = "Sales.tactical-hb@outlook.com"


def eur(v):
    return "%.2f" % v


def uah(v):
    # Space-grouped, the Ukrainian convention and the one the site uses.
    return "{:,}".format(int(round(v))).replace(",", " ")


def wordmark(c, y):
    c.setFont("THB-Bold", 13)
    c.setFillColor(INK)
    c.drawString(LEFT, y, "TACTICAL ")
    c.setFillColor(ACCENT)
    c.drawString(LEFT + c.stringWidth("TACTICAL ", "THB-Bold", 13), y, "HB")
    c.setFillColor(FAINT)
    c.setFont("THB", 8.5)
    c.drawString(LEFT, y - 13, "WHOLESALE")


def table(c, y, lines, cur, copy):
    """One book's table. Returns the y below it."""
    c.setFont("THB-Bold", 8)
    c.setFillColor(FAINT)
    c.drawString(LEFT, y, copy["product"])
    c.drawRightString(RIGHT, y, copy["unit"])
    y -= 5
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.line(LEFT, y, RIGHT, y)
    y -= 13

    for row in lines:
        value = row["eur"] if cur == "eur" else row["uah"]
        c.setFont("THB", 10)
        c.setFillColor(INK)
        c.drawString(LEFT, y, row["label"])
        c.setFont("THB-Bold", 10)
        c.drawRightString(RIGHT, y, eur(value) if cur == "eur" else uah(value))
        y -= 6
        c.setStrokeColor(LINE)
        c.line(LEFT, y, RIGHT, y)
        y -= ROW - 6
    return y


def page(c, cur, books, copy, page_no):
    y = H - 54
    wordmark(c, y)
    c.setFont("THB", 9)
    c.setFillColor(MUTED)
    c.drawRightString(RIGHT, y, copy["rail"])
    y -= 30

    c.setStrokeColor(ACCENT)
    c.setLineWidth(1.4)
    c.line(LEFT, y, LEFT + 46, y)
    y -= 22

    c.setFont("THB-Bold", 20)
    c.setFillColor(INK)
    c.drawString(LEFT, y, copy["title"])
    y -= 15
    c.setFont("THB", 9.5)
    c.setFillColor(MUTED)
    c.drawString(LEFT, y, copy["sub"])
    y -= 26

    for (heading, blurb), key in zip(copy["books"], ("shop", "lounge")):
        c.setFont("THB-Bold", 11)
        c.setFillColor(ACCENT)
        c.drawString(LEFT, y, heading)
        y -= 12
        c.setFont("THB", 9)
        c.setFillColor(MUTED)
        c.drawString(LEFT, y, blurb)
        y -= 17
        y = table(c, y, books[key], cur, copy)
        c.setFont("THB", 8.5)
        c.setFillColor(FAINT)
        c.drawString(LEFT, y, copy["note"])
        y -= 24

    c.setFont("THB-Bold", 9.5)
    c.setFillColor(INK)
    c.drawString(LEFT, y, copy["terms_title"])
    y -= 13
    c.setFont("THB", 8.5)
    c.setFillColor(MUTED)
    for line in copy["terms"]:
        c.drawString(LEFT, y, line)
        y -= 11.5

    c.setFont("THB", 8)
    c.setFillColor(FAINT)
    c.drawString(LEFT, FOOTER_Y, copy["footer"])
    c.drawCentredString(W / 2, FOOTER_Y, "%d / 2" % page_no)
    c.drawRightString(RIGHT, FOOTER_Y, SALES)

    """THE PAGE IS NOT ALLOWED TO OVERFLOW QUIETLY. The first draft of this
       layout ran the terms straight through the footer and off the sheet, and
       the only reason it was caught is that somebody looked at the render. Add
       a product to a book and this raises instead — tighten ROW, or split."""
    last_baseline = y + 11.5
    if last_baseline < FLOOR:
        raise SystemExit(
            "Page %d overflows: last line sits at %.0fpt, floor is %dpt.\n"
            "Reduce ROW (currently %d) or move the terms to their own page."
            % (page_no, last_baseline, FLOOR, ROW)
        )


def main():
    register_fonts()
    books = fetch()

    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle("Tactical HB — Wholesale Price List")
    c.setAuthor("Tactical HB")
    page(c, "eur", books, COPY["eur"], 1)
    c.showPage()
    page(c, "uah", books, COPY["uah"], 2)
    c.showPage()
    c.save()

    print("wrote %s" % OUT)
    for book in ("shop", "lounge"):
        print("\n%s" % book.upper())
        for row in books[book]:
            print("   %-40s €%-8s ₴%s" % (row["label"], row["eur"], row["uah"]))


if __name__ == "__main__":
    main()
