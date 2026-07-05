import Link from "next/link";
import Image from "next/image";
import { Product } from "@/lib/products";

export default function FlagshipTile({
  product,
  locale,
  dark,
}: {
  product: Product;
  locale: string;
  dark: boolean;
}) {
  const name = locale === "uk" ? product.nameUk : product.nameEn;
  const tagline = locale === "uk" ? product.taglineUk : product.taglineEn;
  const viewLabel = locale === "uk" ? "Переглянути" : "View";
  const buyLabel = locale === "uk" ? "Купити" : "Buy";

  // A tile with its own photo background is always treated as light
  const hasHero = Boolean(product.tileImage);
  const isDark = hasHero ? false : dark;

  const textColor = isDark ? "#f4f3f0" : "var(--text)";
  const subColor = isDark ? "#9a978f" : "var(--text-muted)";
  const gold = isDark ? "var(--gold-bright)" : "var(--gold)";

  return (
    <div
      className="relative flex flex-col items-center text-center px-6 pt-16 pb-10 min-h-[520px] overflow-hidden"
      style={{ background: hasHero ? product.tileBg : isDark ? "var(--ink)" : "var(--sea-salt)" }}
    >
      <h3 className="font-display text-4xl md:text-5xl mb-3" style={{ color: textColor }}>
        {name}
      </h3>
      <p className="text-sm md:text-base mb-7 max-w-xs" style={{ color: subColor }}>
        {tagline}
      </p>
      <div className="flex items-center gap-3 relative z-10">
        <Link
          href={`/${locale}/products/${product.slug}`}
          className="rounded-full px-6 py-2 text-sm font-medium transition-opacity hover:opacity-85"
          style={{ background: gold, color: isDark ? "var(--ink)" : "#ffffff" }}
        >
          {viewLabel}
        </Link>
        <Link
          href={`/${locale}/wholesale`}
          className="rounded-full px-6 py-2 text-sm font-medium border transition-colors hover:opacity-70"
          style={{ borderColor: gold, color: gold }}
        >
          {buyLabel}
        </Link>
      </div>

      {hasHero ? (
        /* Enlarged product hero — Apple style */
        <div className="relative flex-1 w-full mt-2">
          <Image
            src={product.tileImage!}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain scale-[1.38] origin-center"
          />
        </div>
      ) : (
        /* Blank image area — faint logo placeholder for a future product photo */
        <div className="flex-1 w-full flex items-center justify-center mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tct-logo.svg"
            alt=""
            aria-hidden="true"
            className="w-[42%] max-w-[190px]"
            style={{ opacity: isDark ? 0.07 : 0.06, filter: isDark ? "none" : "invert(1)" }}
          />
        </div>
      )}
    </div>
  );
}
