# THB-OS operator manuals

Two PDFs, same content, two languages:

- `THB_OS_User_Manual_EN.pdf` — English
- `THB_OS_User_Manual_UK.pdf` — Ukrainian

Both describe THB-OS **as it actually is on 27 July 2026**, after Phase F. They
document screens that exist, name buttons exactly as the interface names them,
and end with a section listing what is *not* built — so the manual can never be
mistaken for a description of a bigger system than we have.

## Rebuilding them

The PDFs are generated, not hand-edited. Edit the content, then rebuild:

```bash
cd docs/manuals && python3 -c "
import manual_builder as mb, content_en, content_uk
mb.build('THB_OS_User_Manual_EN.pdf', content_en.COVER, content_en.BLOCKS,
         'THB-OS Operator Manual · v1.0 · 27 July 2026')
mb.build('THB_OS_User_Manual_UK.pdf', content_uk.COVER, content_uk.BLOCKS,
         'THB-OS: посібник оператора · в. 1.0 · 27 липня 2026')"
```

Requires `reportlab` (`pip3 install reportlab`).

- `manual_builder.py` — the layout engine. One engine for both languages, so the
  two manuals cannot drift into looking like different documents.
- `content_en.py` / `content_uk.py` — the text, as a list of blocks.

## Two things to know before editing

**Fonts.** Everything is set in PT Sans, which was designed for Cyrillic and
carries the hryvnia sign. Do not switch to Arial Unicode: it has no `₴` and
renders it as a null box that survives every visual check because the text layer
still looks fine.

**Glyph coverage.** PT Sans has no `→` in any weight. Navigation paths use `›`
instead. Before shipping a change, check that every character you introduced
exists in every weight — a missing glyph is silent:

```bash
python3 -c "
from fontTools.ttLib import TTFont
import content_uk, re, html
cm = set(TTFont('/System/Library/Fonts/Supplemental/PTSans.ttc', fontNumber=7, lazy=True).getBestCmap())
chars = set(html.unescape(re.sub(r'<[^>]+>', '', str(content_uk.BLOCKS))))
print(sorted(c for c in chars if ord(c) not in cm and c not in '\n\t'))"
```

## When to reissue

Whenever a screen changes. The manual states its own version and date on the
cover and in the footer of every page; if the software has moved on, bump both.
