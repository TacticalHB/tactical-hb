#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the illustrated "how to register as a wholesale partner" guide.

    npx next start -p 3100                       # a PRODUCTION build
    node shoot.mjs && node boxes.mjs             # captures + element boxes
    python3 annotate.py                          # draws the callout rings
    python3 scripts/build-wholesale-guide.py     # this

WHY THE SCREENSHOTS ARE GENERATED RATHER THAN TAKEN BY HAND. A guide made of
hand-cropped screenshots is stale the first time a button moves, and nobody
finds out until a partner writes in confused. The captures come from the site
itself and the callout rings are drawn from measured element positions, so the
whole document is one command away from being current.

AGAINST A PRODUCTION BUILD, NOT `next dev`. The dev server paints its own badge
over the bottom-left corner — an "N" disc and a red "1 Issue" pill — and a
customer-facing guide showing a framework error indicator would be worse than
no guide at all.

NOTHING IS EVER SUBMITTED. Pressing "Send verification code" sends a real
one-time code, and finishing the form creates a real pending partner row. The
later screens are reached with a temporary `?step=` override that lives only in
the working tree while the captures run and is reverted immediately after.
"""

import os
import sys
from datetime import date

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

SHOTS = os.environ.get("GUIDE_SHOTS", ".")
OUT_DIR = os.environ.get(
    "GUIDE_OUT",
    os.path.expanduser(
        "~/Library/CloudStorage/OneDrive-LiverpoolJohnMooresUniversity/tct project"
    ),
)

# Arial carries Cyrillic; Helvetica, which ReportLab ships with, does not, and
# the Ukrainian edition would print as boxes.
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
LEFT, RIGHT = 46, W - 46
TOP = H - 58
FOOTER_Y = 38
FLOOR = FOOTER_Y + 22
COL = RIGHT - LEFT

SALES_EMAIL = "sales@tactical-hb.com"   # mirrors SALES_EMAIL in lib/contact-info.ts
SITE = "tactical-hb.com"

# strftime("%B") answers in the C locale, so the Ukrainian edition was dated
# "17 September 2026". Named here rather than reaching for a locale the system
# may not have installed.
MONTHS_UK = [
    "січня", "лютого", "березня", "квітня", "травня", "червня",
    "липня", "серпня", "вересня", "жовтня", "листопада", "грудня",
]


def today(locale):
    d = date.today()
    if locale == "uk":
        return f"{d.day} {MONTHS_UK[d.month - 1]} {d.year}"
    return d.strftime("%d %B %Y")

# --------------------------------------------------------------------------
#  The words. One dict per language, same keys, so the two editions cannot
#  drift apart in structure — only in wording.
# --------------------------------------------------------------------------
COPY = {
    "en": {
        "title": "How to register as a wholesale partner",
        "sub": "Six screens, about three minutes",
        "intro": (
            "Trade accounts are opened by hand. This guide shows exactly what to press on "
            f"{SITE}. The numbered rings mark the thing to click or fill in on each screen."
        ),
        "before_h": "Before you start",
        "before": (
            "Have your company name, the country and city you trade from, and a work email "
            "address you can open right now — a one-time code is sent to it during the process."
        ),
        "steps": [
            ("01-nav", "Open the Wholesale page",
             "Go to " + SITE + " and press WHOLESALE in the menu at the top of any page."),
            ("02-wholesale", "Press Register",
             "Scroll down to “Already a partner?”. Press “Register as a wholesale partner” "
             "— the outlined button. The orange one beside it (“Partner sign in”) is for partners "
             "who already have an account."),
            ("03-email", "Enter your work email and send the code",
             "Type the address you want the account to belong to, then press “Send verification code”. "
             "A six-digit code arrives by email within a minute."),
            ("04-details", "Enter the code and your company",
             "Type the code from the email, then your company name. If the address was wrong, "
             "press Edit beside it and start again."),
            ("05-details-lower", "Finish the form and submit",
             "Choose your type of business, create a password for the account, then press "
             "“Submit application”. Telephone, country, city and the note about your "
             "business help us review it faster."),
            ("06-done", "That is the application sent",
             "You will see “Application received”. Nothing else is needed on the website."),
        ],
        "after_h": "What happens next",
        "after": [
            "Your account is created straight away but stays locked: wholesale prices and ordering "
            "are not visible until we approve it.",
            "We review the application by hand and email you when the account is open.",
            f"If you have not already, email your completed application form and trade documents to "
            f"{SALES_EMAIL} — that is usually what we are waiting on.",
            "Once approved, sign in and order through the trade portal: set your quantities, send the "
            "list, and we email you the payment details.",
        ],
        "help": f"Questions at any point: {SALES_EMAIL}",
        "step_word": "Step",
    },
    "uk": {
        "title": "Як зареєструватися оптовим партнером",
        "sub": "Шість екранів, близько трьох хвилин",
        "intro": (
            "Оптові акаунти відкриваємо вручну. Ця інструкція показує, що саме натискати на "
            f"{SITE}. Пронумеровані кола позначають те, що треба натиснути або заповнити."
        ),
        "before_h": "Що підготувати",
        "before": (
            "Назву компанії, країну та місто, де ви працюєте, і робочу електронну пошту, до якої "
            "маєте доступ зараз — на неї надійде одноразовий код."
        ),
        "steps": [
            ("01-nav", "Відкрийте сторінку «Опт»",
             "Перейдіть на " + SITE + " і натисніть ОПТ у меню вгорі будь-якої сторінки."),
            ("02-wholesale", "Натисніть «Стати оптовим партнером»",
             "Прокрутіть до блоку «Вже наш партнер?». Натисніть «Стати оптовим партнером» — "
             "кнопку з рамкою. Помаранчева поруч («Вхід для партнерів») — для тих, хто вже має акаунт."),
            ("03-email", "Введіть робочу пошту й надішліть код",
             "Вкажіть адресу, на яку буде оформлено акаунт, і натисніть «Надіслати код». "
             "Шестизначний код прийде на пошту протягом хвилини."),
            ("04-details", "Введіть код і назву компанії",
             "Впишіть код із листа, а потім назву компанії. Якщо адреса неправильна — "
             "натисніть «Змінити» поруч із нею."),
            ("05-details-lower", "Заповніть решту й надішліть",
             "Оберіть тип бізнесу, створіть пароль до акаунта й натисніть «Надіслати заявку». "
             "Телефон, країна, місто та опис бізнесу пришвидшують розгляд."),
            ("06-done", "Заявку надіслано",
             "Ви побачите «Заявку отримано». Більше на сайті робити нічого не потрібно."),
        ],
        "after_h": "Що далі",
        "after": [
            "Акаунт створюється одразу, але залишається закритим: оптові ціни та замовлення "
            "недоступні, доки ми не підтвердимо заявку.",
            "Ми розглядаємо заявку вручну й пишемо вам, щойно акаунт буде відкрито.",
            f"Якщо ще не надсилали — надішліть заповнену форму заявки та документи на "
            f"{SALES_EMAIL}. Зазвичай саме на них ми чекаємо.",
            "Після підтвердження увійдіть і замовляйте через оптовий портал: вкажіть кількості, "
            "надішліть список, і ми надішлемо реквізити для оплати.",
        ],
        "help": f"Питання на будь-якому етапі: {SALES_EMAIL}",
        "step_word": "Крок",
    },
}


def register_fonts():
    for name, path in FONTS.items():
        if not os.path.exists(path):
            sys.exit(f"Missing font: {path}")
        pdfmetrics.registerFont(TTFont(name, path))


class Doc:
    """A canvas with a cursor. Every writer goes through need(), which is the
    only place a page break happens — so a step's heading can never strand
    itself at the foot of a page with its screenshot overleaf."""

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
        c.drawString(LEFT, FOOTER_Y, f"TACTICAL HB  ·  {SITE}")
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

    def para(self, text, font="THB", size=9.8, colour=MUTED, lead=14, indent=0, width=None):
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
        self.need(20)
        self.c.setFont("THB-Bold", 7.5)
        self.c.setFillColor(ACCENT)
        self.c.drawString(LEFT, self.y, " ".join(text.upper()))
        self.y -= 14

    def bullet(self, text):
        lines = self.wrap(text, "THB", 9.8, COL - 16)
        self.need(14 * len(lines))
        for i, ln in enumerate(lines):
            if i == 0:
                self.c.setFillColor(ACCENT)
                self.c.setFont("THB", 9.8)
                self.c.drawString(LEFT, self.y, "—")
            self.c.setFont("THB", 9.8)
            self.c.setFillColor(MUTED)
            self.c.drawString(LEFT + 16, self.y, ln)
            self.y -= 14


def wordmark(c, y):
    """TACTICAL in ink, HB in the accent. Tracking is set on a TEXT OBJECT and
    put back to zero before drawing — it lives in the canvas graphics state and
    survives drawText, so leaving it set makes every paragraph render wide."""
    t = c.beginText(LEFT, y)
    t.setFont("THB-Bold", 14)
    t.setCharSpace(3.0)
    t.setFillColor(INK)
    t.textOut("TACTICAL")
    t.setFillColor(ACCENT)
    t.textOut(" HB")
    t.setCharSpace(0)
    c.drawText(t)


def shot(d, path):
    """One screenshot, full column width, never split across a page."""
    img = ImageReader(path)
    iw, ih = img.getSize()
    w = COL
    h = w * ih / iw

    # A screen taller than a page is scaled to fit one rather than cut in half.
    max_h = TOP - FLOOR - 10
    if h > max_h:
        h = max_h
        w = h * iw / ih

    d.need(h + 10)
    x = LEFT + (COL - w) / 2
    d.c.drawImage(img, x, d.y - h, width=w, height=h, mask="auto")
    d.c.setStrokeColor(LINE)
    d.c.setLineWidth(0.5)
    d.c.rect(x, d.y - h, w, h, stroke=1, fill=0)
    d.y -= h + 10


def build(locale):
    t = COPY[locale]
    out = f"{OUT_DIR}/Tactical_HB_Wholesale_Registration_Guide_{locale.upper()}.pdf"
    os.makedirs(OUT_DIR, exist_ok=True)

    c = canvas.Canvas(out, pagesize=A4)
    c.setTitle(t["title"])
    c.setAuthor("Tactical HB")
    d = Doc(c)

    wordmark(c, H - 62)
    d.y = H - 112

    c.setFont("THB-Bold", 21)
    c.setFillColor(INK)
    for ln in d.wrap(t["title"], "THB-Bold", 21, COL):
        c.drawString(LEFT, d.y, ln)
        d.y -= 25
    c.setFont("THB", 10)
    c.setFillColor(FAINT)
    c.drawString(LEFT, d.y, f"{t['sub']}  ·  {today(locale)}")
    d.y -= 18
    d.rule(ACCENT, 1.2)
    d.gap(12)

    d.para(t["intro"], colour=INK)
    d.gap(12)
    d.label(t["before_h"])
    d.para(t["before"])
    d.gap(16)

    for i, (shot_name, heading, body) in enumerate(t["steps"], start=1):
        path = f"{SHOTS}/annotated-{locale}/{shot_name}.png"
        if not os.path.exists(path):
            sys.exit(f"Missing screenshot: {path}")

        # The heading, its sentence and its picture are one block. Reserving
        # them together is what stops a step being introduced on one page and
        # illustrated on the next.
        d.need(150)
        c.setFont("THB-Bold", 8)
        c.setFillColor(ACCENT)
        c.drawString(LEFT, d.y, f"{t['step_word'].upper()} {i}")
        d.y -= 15
        c.setFont("THB-Bold", 13)
        c.setFillColor(INK)
        for ln in d.wrap(heading, "THB-Bold", 13, COL):
            c.drawString(LEFT, d.y, ln)
            d.y -= 17
        d.gap(2)
        d.para(body)
        d.gap(7)
        shot(d, path)
        d.gap(14)

    # THE CLOSING BLOCK IS ONE THING. Reserved whole rather than line by line:
    # a smaller reservation let the rule, the heading and the bullets fit while
    # pushing the contact line onto a page of its own, which read as a document
    # that had run out rather than finished.
    d.need(215)
    d.rule()
    d.gap(6)
    d.label(t["after_h"])
    for line in t["after"]:
        d.bullet(line)
    d.gap(10)
    d.para(t["help"], font="THB-Bold", colour=INK)

    d.footer()
    c.save()
    print(f"Wrote {out}  ({d.page} pages)")


def main():
    register_fonts()
    for loc in ("en", "uk"):
        build(loc)


if __name__ == "__main__":
    main()
