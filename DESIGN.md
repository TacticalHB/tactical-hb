# Tactical HB — Design System Handoff

Paste this into Claude Design (claude.ai/design) so it knows the current site's design language. Live site: https://tactical-hb.vercel.app · Repo: https://github.com/TacticalHB/tactical-hb

## Brand
Ukrainian premium hookah accessories. Military/tactical aesthetic, weaponry-inspired, premium/luxury. Bilingual: Ukrainian (default) + English. Dual audience: B2B wholesale + B2C. Feel: "$10K" cinematic, restrained, confident.

## Colour palette (exact)
Light base:
- Background `#f7f5f1` (warm off-white — main page)
- Soft background `#efece5` (page headers)
- Sea Salt White `#edefe4` (light product tiles)
- Studio grey `#d5d8d9` (product-photo tile fill)
- Card `#f1eee8`, Field/white `#ffffff`

Dark accents:
- Ink `#111114` (nav, footer, dark tiles, hero panel)
- Ink-2 `#1a1a1d`

Gold:
- Gold `#a87f2c` (accent on light surfaces)
- Gold-bright `#d4b15e` (accent on dark surfaces)

Text:
- Primary `#17160f`, Muted `#6c6860`, Faint `#a39d92`
- On dark: `#f4f3f0` / `#9a978f`

Borders: `#e4e0d8` (light), `#2a2a2e` (dark). White dividers/frame: `#ffffff`.

## Typography
- Display / headings: **Bebas Neue** (condensed, all-caps, tracked ~0.03em) — class `.font-display`
- Body / UI: **Inter** (300–600)
- Heavy stacked product names: **Inter 800**, uppercase — class `.font-name`

## Layout & signature devices
- **10px pure-white gutters/frame** everywhere (Apple-style): a fixed white border frames the whole viewport on every page; 10px white lines between all sections; a 10px white vertical line splits the hero.
- **Split hero**: left = light column (TACTICAL HB wordmark, HB in gold, subtitle, CTAs); right = dark panel with the faint TCT target logo (~15% opacity) centred, drifting embers, gold glow.
- **Flagship section = Apple-style 2×2 tile grid**: big tiles, alternating dark(ink)/light(sea-salt), each with product name (Bebas), a short tagline, gold **View** (filled pill) + **Buy** (outline pill), and either an enlarged cut-out product on a flat colour fill (see HMD TCT OP tile, studio grey) or a faint logo placeholder.
- **Video band**: full-width 16:9, silent autoplay loop, between hero and tiles.
- Sharp corners site-wide (tactical), except product image tiles have a subtle radius and the tile buttons are full pills.

## Motion (subtle, ~600–800ms, respects reduced-motion)
- Scroll reveal: fade + drift-up
- Hero: ambient gold glow pulse, drifting ash/ember particles (canvas), scroll cue
- Flagship countdown digits: amber LED glow
- Product hover: image zoom / tile lift

## Pages
Home, Products (grid), Product detail (gallery), Wholesale (enquiry form), About, Contact. Nav dark & fixed; footer dark & minimal ("Follow us @tactical_hb").

## Tech (for implementation context — Claude Code handles this)
Next.js 16 (App Router) · Tailwind v4 · next-intl · deployed on Vercel. Product data + taglines live in `lib/products.ts`. Assets in `public/images` and `public/videos`.

## What to design
When proposing changes, give: exact hex values, font choices, spacing, and a layout sketch or HTML/CSS mock. Keep the tactical/premium DNA and the 10px white-frame grid unless intentionally changing it.
