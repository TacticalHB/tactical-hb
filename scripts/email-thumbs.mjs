// Build the square product thumbnails used by the marketing emails.
//
//   npm run email:thumbs
//
// WHY THESE EXIST AT ALL. Email cannot contain an image — there is no reliable
// object-fit, and a client that honours width and height honours both, so a
// tall source in a square frame is a squashed product. The only bulletproof
// answer is a source that is already square, which is what this makes.
//
// It also fixes the weight. The catalogue heroes are 1200–1400px and 96–562 KB
// each; four of those in one mail is two megabytes to show four 76px thumbs.
// These come out around 10 KB.
//
// 152px for a 76px slot, so it stays sharp on a retina screen. Flattened onto
// #F5F5F5 — the exact background the product photography is shot on — so a
// transparent PNG and an opaque JPEG land on the same colour and no edge or
// letterbox band is visible against the photo.
//
// RE-RUN THIS WHENEVER A PRODUCT PHOTO CHANGES. The output is committed, and a
// stale thumbnail is a mail showing last season's finish.

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/email/products");

/** Display size in the mail, and the source multiplier for retina. */
const SIZE = 152;
const MATTE = "#F5F5F5";

// Every image a cart line can resolve to: the variant photo when one is
// chosen, otherwise the catalogue square. Deliberately NOT tileImage — those
// are tall bleed cut-outs for the flagship tiles (524×968 and the like), and
// they are exactly what was warping the rows.
const SOURCES = [
  "/images/hmd-classic-1.jpg",
  "/images/hmd-acraft-hero.png",
  "/images/hmd-op-black.png",
  "/images/hmd-op-purple.png",
  "/images/killer-hero-v2.png",
  "/images/livanka-hero.png",
  "/images/ftp-hero-v2.png",
  "/images/windcover-detonator-1.jpg",
  "/images/windcover-kh-1.jpg",
];

mkdirSync(outDir, { recursive: true });

const script = `
import sys
from PIL import Image

size, matte = ${SIZE}, "${MATTE}"
rgb = tuple(int(matte[i:i+2], 16) for i in (1, 3, 5))

for src, dst in zip(sys.argv[1::2], sys.argv[2::2]):
    im = Image.open(src)
    im = im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")

    # Square the canvas BEFORE resizing, so a source that is not 1:1 is padded
    # rather than distorted. Today every source is already square and this is a
    # no-op; it is here so that stops being something to remember.
    w, h = im.size
    if w != h:
        side = max(w, h)
        canvas = Image.new("RGBA", (side, side), rgb + (255,))
        canvas.paste(im, ((side - w) // 2, (side - h) // 2), im if im.mode == "RGBA" else None)
        im = canvas

    flat = Image.new("RGB", im.size, rgb)
    flat.paste(im, mask=im.split()[3] if im.mode == "RGBA" else None)
    flat = flat.resize((size, size), Image.LANCZOS)
    flat.save(dst, "JPEG", quality=82, optimize=True, progressive=True)
    print(f"  {dst.rsplit('/', 1)[-1]:34} {len(open(dst,'rb').read()) // 1024:>4} KB")
`;

const args = [];
for (const src of SOURCES) {
  const name = src.split("/").pop().replace(/\.(png|jpe?g)$/i, ".jpg");
  args.push(join(root, "public", src), join(outDir, name));
}

console.log(`Building ${SOURCES.length} email thumbnails at ${SIZE}×${SIZE} on ${MATTE}:`);
execFileSync("python3", ["-c", script, ...args], { stdio: "inherit" });
console.log(`→ public/email/products/`);
