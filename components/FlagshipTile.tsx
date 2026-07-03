import Link from "next/link";
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

  const textColor = dark ? "#f4f3f0" : "var(--text)";
  const subColor = dark ? "#9a978f" : "var(--text-muted)";
  const gold = dark ? "var(--gold-bright)" : "var(--gold)";

  return (
    <div
      className="relative flex flex-col items-center text-center px-6 pt-16 pb-10 min-h-[520px] overflow-hidden"
      style={{ background: dark ? "var(--ink)" : "var(--sea-salt)" }}
    >
      <h3 className="font-display text-4xl md:text-5xl mb-3" style={{ color: textColor }}>
        {name}
      </h3>
      <p className="text-sm md:text-base mb-7 max-w-xs" style={{ color: subColor }}>
        {tagline}
      </p>
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/products/${product.slug}`}
          className="rounded-full px-6 py-2 text-sm font-medium transition-opacity hover:opacity-85"
          style={{ background: gold, color: dark ? "var(--ink)" : "#ffffff" }}
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

      {/* Blank image area — faint logo placeholder for a future product photo */}
      <div className="flex-1 w-full flex items-center justify-center mt-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/tct-logo.svg"
          alt=""
          aria-hidden="true"
          className="w-[42%] max-w-[190px]"
          style={{ opacity: dark ? 0.07 : 0.06, filter: dark ? "none" : "invert(1)" }}
        />
      </div>
    </div>
  );
}
