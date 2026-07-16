import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";
import Reveal from "./Reveal";

/**
 * One product, given a full band of the homepage.
 *
 * The card surface is #f5f5f5 on purpose and must stay that exact value: the
 * bowl photography is cut onto solid rgb(245,245,245), so any other colour
 * reveals the photo's own background as a visible box. Transparent cut-outs
 * (the OP ring) composite onto the same surface, which is what lets both kinds
 * of photo share one card design.
 *
 * `scale` evens out visual weight — see the measured fill fractions where the
 * moments are listed. Without it a flat ring looks lost beside a tall bowl.
 */
export default function ProductMoment({
  product,
  locale,
  index,
  flip,
  scale = 1,
}: {
  product: Product;
  locale: string;
  /** 1-based; rendered as the editorial 01 / 02 / 03 marker */
  index: number;
  /** true = photo on the right, copy on the left */
  flip: boolean;
  scale?: number;
}) {
  const uk = locale === "uk";
  const name = uk ? product.nameUk : product.nameEn;
  const tagline = uk ? product.taglineUk : product.taglineEn;
  const href = `/${locale}/products/${product.slug}`;

  const categoryLabel = {
    hmd: uk ? "Керування жаром" : "Heat Management",
    bowl: uk ? "Чаша" : "Bowl",
    accessory: uk ? "Аксесуар" : "Accessory",
  }[product.category];

  // Variants can cost more than the base (OP: black €21, purple €24), and the
  // photo shown here is not always the cheapest one — so say "from" rather
  // than print a price the pictured item isn't sold at.
  const prices = product.variants?.length
    ? product.variants.map((v) => v.price ?? product.price)
    : [product.price];
  const lowest = Math.min(...prices);
  const varies = Math.max(...prices) !== lowest;
  const price = `€${lowest.toFixed(2)}`;

  return (
    <section className="px-6 py-20 md:py-32">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-20 items-center">
        {/* Photograph — the point of the whole band */}
        <Reveal className={flip ? "md:order-2" : ""}>
          <Link
            href={href}
            aria-label={name}
            className="moment-card group block relative aspect-square rounded-[20px] overflow-hidden"
            style={{ background: "#f5f5f5" }}
          >
            <Image
              src={product.image}
              alt={name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="moment-photo object-contain"
              style={{ ["--moment-scale" as string]: String(scale) }}
              priority={index === 1}
            />
          </Link>
        </Reveal>

        {/* Copy */}
        <Reveal delay={140} className={flip ? "md:order-1" : ""}>
          <div className="max-w-sm">
            <div
              className="flex items-center gap-3 text-[0.6rem] tracking-[0.3em] uppercase mb-6"
              style={{ color: "var(--text-faint)" }}
            >
              <span className="tabular-nums">{String(index).padStart(2, "0")}</span>
              <span className="w-6 h-px" style={{ background: "var(--border-strong)" }} />
              <span>{categoryLabel}</span>
            </div>

            <h2
              className="font-display leading-[0.95] mb-5"
              style={{ color: "var(--text)", fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)" }}
            >
              {name}
            </h2>

            <p className="text-base leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
              {tagline}
            </p>

            <div className="flex items-center gap-6">
              <Link href={href} className="moment-cta text-xs tracking-[0.18em] uppercase">
                {uk ? "Переглянути" : "View"}
                <span className="moment-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
              <span className="text-sm tabular-nums" style={{ color: "var(--text-faint)" }}>
                {varies ? (uk ? `від ${price}` : `from ${price}`) : price}
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
