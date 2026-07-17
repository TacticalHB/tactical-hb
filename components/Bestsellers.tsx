import Link from "next/link";
import Image from "next/image";
import Reveal from "./Reveal";

/**
 * "Explore our bestsellers" — a calm 2×2 of floating products, Bang & Olufsen
 * in feel: the product hovers on the page's own background, and only on hover
 * does a soft white panel rise behind it. Name underlines, "View" only, no price.
 *
 * Every image here is a TRANSPARENT cut-out on purpose. The floating +
 * white-on-hover effect only works if the photo carries no background of its
 * own — a baked backdrop would flash as a grey box the instant the white
 * appears. ftp/killer/acraft were cut from their #f5f5f5 heroes for this;
 * hmd-op-black was already transparent.
 *
 * `scale` evens out visual weight: two tall bowls vs two flat rings. Measured
 * fill (H): FTP 81%, Killer 74%, OP 40%, A-Craft 33% — so the rings get pushed
 * up and the bowls eased down.
 */
const ITEMS = [
  { slug: "bowl-phunnel", label: "FTP Bowl", img: "/images/ftp-cut.png", scale: 0.9 },
  { slug: "bowl-killer", label: "Killer Bowl", img: "/images/killer-cut.png", scale: 0.96 },
  { slug: "hmd-tct-op", label: "HMD TCT OP", img: "/images/hmd-op-black.png", scale: 1.2 },
  { slug: "hmd-a-craft", label: "HMD A Craft", img: "/images/acraft-cut.png", scale: 1.16 },
];

export default function Bestsellers({ locale }: { locale: string }) {
  const uk = locale === "uk";
  const heading = uk ? "Обрані бестселери" : "Explore our bestsellers";
  const view = uk ? "Переглянути" : "View";
  const seeAll = uk ? "Уся колекція" : "See the full collection";

  return (
    <section className="page-container py-24 md:py-32">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          {/* Deliberately NOT the bold condensed display face — the brief asks
              for subtle and elegant, so this is a light, letter-spaced heading. */}
          <h2
            className="text-center mb-16 md:mb-20 uppercase"
            style={{
              color: "var(--text)",
              fontSize: "clamp(0.95rem, 1.6vw, 1.2rem)",
              fontWeight: 400,
              letterSpacing: "0.24em",
            }}
          >
            {heading}
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-12">
          {ITEMS.map((item, i) => (
            <Reveal key={item.slug} delay={i * 90}>
              <Link
                href={`/${locale}/products/${item.slug}`}
                aria-label={item.label}
                className="bestseller group block rounded-[20px] px-6 pt-8 pb-7"
              >
                <div className="bestseller-media relative w-full aspect-[4/3]">
                  <Image
                    src={item.img}
                    alt={item.label}
                    fill
                    sizes="(max-width: 640px) 100vw, 45vw"
                    className="bestseller-photo object-contain"
                    style={{ ["--bs-scale" as string]: String(item.scale) }}
                  />
                </div>

                <div className="mt-6 flex items-center justify-between gap-4">
                  <span
                    className="bestseller-name text-lg"
                    style={{ color: "var(--text)" }}
                  >
                    {item.label}
                  </span>
                  <span className="bestseller-view text-xs tracking-[0.18em] uppercase inline-flex items-center gap-2">
                    {view}
                    <span className="bestseller-arrow" aria-hidden="true">
                      →
                    </span>
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        {/* Path to the rest of the catalogue — preserved from the old showcase
            this section replaced, so the homepage still links to /products. */}
        <Reveal>
          <div className="mt-16 md:mt-20 flex justify-center">
            <Link href={`/${locale}/products`} className="pill-outline">
              {seeAll}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
