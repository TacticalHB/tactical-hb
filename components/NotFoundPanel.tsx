import Link from "next/link";
import { getTranslations } from "next-intl/server";

/* ---------------------------------------------------------------------------
   The 404, as a component rather than a page, because there have to be two.

   Next resolves the two cases separately: an explicit notFound() call renders
   the nearest not-found.tsx in the matched segment tree, while a URL that
   matches no route at all falls back to the root one. A product page with a
   bad slug is the first; /uk/nonsense is the second. Both need to say the same
   thing, so both render this.

   getTranslations() RATHER THAN useTranslations(): the root not-found renders
   inside app/layout.tsx, which is above NextIntlClientProvider — the hook has
   no context there and would throw. The server API reads the catalogue
   directly and works in either position.
--------------------------------------------------------------------------- */

export default async function NotFoundPanel({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "notfound" });

  return (
    <div
      className="flex-1 flex items-center justify-center px-6 py-32"
      style={{ background: "var(--bg)" }}
    >
      <div className="max-w-xl w-full">
        {/* The numeral is the page's only ornament, set in the display face at
            the scale the rest of the site reserves for section headings. It
            was previously the entire page. */}
        <div
          className="font-display leading-none mb-6"
          style={{ color: "var(--accent-ink)", fontSize: "clamp(3.5rem, 12vw, 7rem)" }}
        >
          404
        </div>

        <h1
          className="font-display text-3xl md:text-4xl mb-5"
          style={{ color: "var(--text)" }}
        >
          {t("title")}
        </h1>

        <p
          className="text-[15px] leading-relaxed mb-10 max-w-md"
          style={{ color: "var(--text-muted)" }}
        >
          {t("body")}
        </p>

        {/* TWO WAYS OUT, WHICH IS THE ENTIRE POINT. The bare 404 this replaces
            had none — a dead end on a shop is a lost sale, not a status code. */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <Link
            href={`/${locale}/products`}
            className="inline-flex h-12 px-9 rounded-full items-center justify-center text-[14px] font-medium whitespace-nowrap transition-opacity hover:opacity-85"
            style={{ background: "var(--accent)", color: "#111114" }}
          >
            {t("products")}
          </Link>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center h-11 text-[14px] underline underline-offset-4 transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            {t("home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
