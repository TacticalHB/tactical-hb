import Link from "next/link";
import { t } from "@/lib/i18n-text";
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
 * appears. Each is cut from the product's own photograph; hmd-op-cut exists
 * separately from hmd-op-black because that file is the PDP's Black variant
 * and must keep its own framing.
 *
 * PAIRS ARE MATCHED IN THE IMAGE, NOT THE SCALE. Each row holds two products
 * side by side, and their cut-outs are built to the same rendered geometry, so
 * both members of a row share one scale value. Chasing a match by nudging
 * `scale` does not hold: the old Killer cut carried a pale halo that made the
 * bowl read smaller than its bounding box, so the numbers agreed while the page
 * did not.
 *
 * Row 1 (FTP / Killer) matches on height — the two bowls have near-identical
 * proportions, so one axis settles both. Row 2 (OP / A.Craft) cannot: the
 * devices were shot at different angles, 2.08 vs 2.38 wide-to-tall, so matching
 * width would leave the OP 15% taller and matching height would leave it 13%
 * narrower. It is matched on AREA instead, which splits the difference rather
 * than piling the whole error onto one dimension.
 */
const ITEMS = [
  { slug: "bowl-phunnel", label: "FTP Bowl", img: "/images/ftp-cut-v2.png", scale: 0.9 },
  { slug: "bowl-killer", label: "Killer Bowl", img: "/images/killer-cut.png", scale: 0.9 },
  { slug: "hmd-tct-op", label: "HMD TCT OP", img: "/images/hmd-op-cut.png", scale: 1.16 },
  { slug: "hmd-a-craft", label: "HMD A Craft", img: "/images/acraft-cut.png", scale: 1.16 },
];

export default function Bestsellers({ locale }: { locale: string }) {
  const heading = t(locale, { uk: "Обрані бестселери", en: "Explore our bestsellers", ja: "人気の製品を見る", ar: "تصفّح الأكثر مبيعًا" });
  const view = t(locale, { uk: "Переглянути", en: "View", ja: "見る", ar: "عرض" });
  const seeAll = t(locale, { uk: "Уся колекція", en: "See the full collection", ja: "コレクションをすべて見る", ar: "شاهد المجموعة كاملة" });

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
