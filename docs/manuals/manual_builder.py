"""Shared layout engine for the THB-OS operator manuals.

One engine, two languages. The content files supply blocks; this decides how
a block looks, so the English and Ukrainian manuals cannot drift into looking
like two different documents.

PT Sans throughout: it was designed for Cyrillic, it carries the hryvnia sign
(Arial Unicode does not — it renders as a null box), and it has a real bold
and italic in the same family.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    KeepTogether, PageBreak, CondPageBreak, ListFlowable, ListItem,
)

# --- fonts ------------------------------------------------------------------
PTSANS = "/System/Library/Fonts/Supplemental/PTSans.ttc"
PTMONO = "/System/Library/Fonts/Supplemental/PTMono.ttc"

pdfmetrics.registerFont(TTFont("PT", PTSANS, subfontIndex=0))
pdfmetrics.registerFont(TTFont("PT-Bold", PTSANS, subfontIndex=7))
pdfmetrics.registerFont(TTFont("PT-Italic", PTSANS, subfontIndex=1))
pdfmetrics.registerFont(TTFont("PT-Mono", PTMONO, subfontIndex=1))
pdfmetrics.registerFontFamily("PT", normal="PT", bold="PT-Bold", italic="PT-Italic")

# --- palette (the shop's paper colours, not the console's dark deck) --------
INK = colors.HexColor("#17160f")
MUTED = colors.HexColor("#5d5950")
FAINT = colors.HexColor("#8d877c")
LINE = colors.HexColor("#ddd8ce")
ACCENT = colors.HexColor("#9d7d33")
PANEL = colors.HexColor("#f7f5f1")
WARN_BG = colors.HexColor("#fbf3e0")
WARN_LINE = colors.HexColor("#d9b45c")
STOP_BG = colors.HexColor("#fbeceb")
STOP_LINE = colors.HexColor("#c98079")

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm

S = {
    "title": ParagraphStyle("title", fontName="PT-Bold", fontSize=30, leading=35,
                            textColor=INK, spaceAfter=6),
    "subtitle": ParagraphStyle("subtitle", fontName="PT", fontSize=13, leading=18,
                               textColor=MUTED),
    "cover_meta": ParagraphStyle("cover_meta", fontName="PT", fontSize=10, leading=15,
                                 textColor=FAINT),
    "h1": ParagraphStyle("h1", fontName="PT-Bold", fontSize=19, leading=24,
                         textColor=INK, spaceBefore=2, spaceAfter=8),
    "h2": ParagraphStyle("h2", fontName="PT-Bold", fontSize=13.5, leading=17,
                         textColor=INK, spaceBefore=11, spaceAfter=4),
    "h3": ParagraphStyle("h3", fontName="PT-Bold", fontSize=11.5, leading=14.5,
                         textColor=ACCENT, spaceBefore=9, spaceAfter=3),
    "p": ParagraphStyle("p", fontName="PT", fontSize=10.2, leading=14.8,
                        textColor=INK, alignment=TA_LEFT, spaceAfter=6),
    "li": ParagraphStyle("li", fontName="PT", fontSize=10.2, leading=14.6,
                         textColor=INK, spaceAfter=2.5),
    "note": ParagraphStyle("note", fontName="PT", fontSize=9.8, leading=14.6,
                           textColor=INK),
    "cell": ParagraphStyle("cell", fontName="PT", fontSize=9.3, leading=13,
                           textColor=INK),
    "cellhead": ParagraphStyle("cellhead", fontName="PT-Bold", fontSize=9.3,
                               leading=13, textColor=INK),
    "code": ParagraphStyle("code", fontName="PT-Mono", fontSize=9, leading=13.5,
                           textColor=INK, backColor=PANEL,
                           borderPadding=(6, 8, 6, 8), spaceAfter=8),
    "toc": ParagraphStyle("toc", fontName="PT", fontSize=10.5, leading=19,
                          textColor=INK),
}


class Manual(BaseDocTemplate):
    """Two page templates: a bare cover, and body pages with a running footer."""

    def __init__(self, path, title, footer_label, **kw):
        super().__init__(path, pagesize=A4,
                         leftMargin=MARGIN, rightMargin=MARGIN,
                         topMargin=MARGIN, bottomMargin=18 * mm,
                         title=title, author="Tactical HB", **kw)
        self.footer_label = footer_label
        frame = Frame(MARGIN, 18 * mm, PAGE_W - 2 * MARGIN,
                      PAGE_H - MARGIN - 18 * mm, id="body")
        self.addPageTemplates([
            PageTemplate(id="cover", frames=[frame]),
            PageTemplate(id="body", frames=[frame], onPage=self._chrome),
        ])

    def _chrome(self, canv, doc):
        canv.saveState()
        canv.setStrokeColor(LINE)
        canv.setLineWidth(0.5)
        canv.line(MARGIN, 14 * mm, PAGE_W - MARGIN, 14 * mm)
        canv.setFont("PT", 8)
        canv.setFillColor(FAINT)
        canv.drawString(MARGIN, 9.5 * mm, self.footer_label)
        canv.drawRightString(PAGE_W - MARGIN, 9.5 * mm, str(doc.page))
        canv.restoreState()


def _callout(text, bg, edge):
    p = Paragraph(text, S["note"])
    t = Table([[p]], colWidths=[PAGE_W - 2 * MARGIN])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.7, edge),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def build(path, cover, blocks, footer_label):
    doc = Manual(path, cover["title"], footer_label)
    story = []

    # --- cover ---
    story.append(Spacer(1, 42 * mm))
    story.append(Paragraph(cover["wordmark"], ParagraphStyle(
        "wm", fontName="PT-Bold", fontSize=13, leading=17,
        textColor=ACCENT, spaceAfter=22)))
    story.append(Paragraph(cover["title"], S["title"]))
    story.append(Paragraph(cover["subtitle"], S["subtitle"]))
    story.append(Spacer(1, 10 * mm))
    story.append(Table([[""]], colWidths=[62 * mm], rowHeights=[0.9],
                       style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), ACCENT)])))
    story.append(Spacer(1, 10 * mm))
    for lineitem in cover["meta"]:
        story.append(Paragraph(lineitem, S["cover_meta"]))
    story.append(PageBreak())

    # everything after the cover uses the footer template
    from reportlab.platypus import NextPageTemplate
    story.insert(len(story) - 1, NextPageTemplate("body"))

    for block in blocks:
        kind = block[0]

        if kind == "h1":
            # A section starts on a fresh page only when there is not enough
            # room left to be worth starting here. An unconditional break
            # reads well in a printed book and badly in a 26-page manual: it
            # leaves the tail of the previous section stranded alone on a page,
            # which looks like a fault rather than a design.
            if block[2:] and block[2] == "break":
                story.append(CondPageBreak(62 * mm))
            story.append(Spacer(1, 10))
            story.append(KeepTogether([
                Paragraph(block[1], S["h1"]),
                Table([[""]], colWidths=[PAGE_W - 2 * MARGIN], rowHeights=[0.8],
                      style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), LINE)])),
                Spacer(1, 9),
            ]))

        elif kind == "h2":
            story.append(Paragraph(block[1], S["h2"]))

        elif kind == "h3":
            story.append(Paragraph(block[1], S["h3"]))

        elif kind == "p":
            story.append(Paragraph(block[1], S["p"]))

        elif kind == "ul":
            story.append(ListFlowable(
                [ListItem(Paragraph(t, S["li"]), leftIndent=14, value="bullet")
                 for t in block[1]],
                bulletType="bullet", bulletFontName="PT", bulletFontSize=8,
                bulletColor=ACCENT, leftIndent=13, start="•"))
            story.append(Spacer(1, 8))

        elif kind == "steps":
            story.append(ListFlowable(
                [ListItem(Paragraph(t, S["li"]), leftIndent=17) for t in block[1]],
                bulletType="1", bulletFontName="PT-Bold", bulletFontSize=9.6,
                bulletColor=ACCENT, leftIndent=16))
            story.append(Spacer(1, 8))

        elif kind == "table":
            head, rows = block[1], block[2]
            widths = block[3] if len(block) > 3 else None
            data = [[Paragraph(h, S["cellhead"]) for h in head]]
            data += [[Paragraph(c, S["cell"]) for c in r] for r in rows]
            avail = PAGE_W - 2 * MARGIN
            cw = [avail * w for w in widths] if widths else [avail / len(head)] * len(head)
            t = Table(data, colWidths=cw, repeatRows=1)
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), PANEL),
                ("LINEBELOW", (0, 0), (-1, 0), 0.7, LINE),
                ("LINEBELOW", (0, 1), (-1, -2), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(t)
            story.append(Spacer(1, 10))

        elif kind == "note":
            story.append(_callout(block[1], PANEL, LINE))
            story.append(Spacer(1, 9))

        elif kind == "warn":
            story.append(_callout(block[1], WARN_BG, WARN_LINE))
            story.append(Spacer(1, 9))

        elif kind == "stop":
            story.append(_callout(block[1], STOP_BG, STOP_LINE))
            story.append(Spacer(1, 9))

        elif kind == "code":
            story.append(Paragraph(block[1], S["code"]))

        elif kind == "toc":
            for num, label in block[1]:
                story.append(Paragraph(
                    f'<font color="#9d7d33"><b>{num}</b></font>&nbsp;&nbsp;{label}',
                    S["toc"]))
            story.append(Spacer(1, 8))

        elif kind == "gap":
            story.append(Spacer(1, block[1]))

        elif kind == "pagebreak":
            story.append(PageBreak())

    doc.build(story)
    return path
