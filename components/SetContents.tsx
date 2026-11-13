import Image from "next/image";
import Link from "next/link";
import { products, addonProduct, type Product } from "@/lib/products";
import { t } from "@/lib/i18n-text";
import { colourName } from "@/lib/colour-names";

/* ---------------------------------------------------------------------------
   "In the set" — what a set is made of, on its product page (lib/sets).

   NAMES AND PICTURES, NO PRICES. Each part links to its own page, so anyone
   who wants to compare can; the page itself states one saving only, as the
   crossed-out total above, and never as a percentage (Mario, 13 Nov 2026).
--------------------------------------------------------------------------- */

export default function SetContents({ product, locale }: { product: Product; locale: string }) {
  /* ONE ROW PER THING IN THE BOX (Mario, 13 Nov 2026). The lid and the FEAR
     ring are fitted to the HMD and sold as part of its line, but they are
     products in their own right and the customer should see them listed —
     each with its own picture and a link to its page. */
  type Row = { key: string; p: Product; img: string; sub: string; qty: number };
  const fitted = t(locale, { uk: "На HMD TCT OP", en: "Fitted to the HMD TCT OP", ja: "HMD TCT OP に装着", ar: "مركّب على HMD TCT OP" });
  const rows: Row[] = [];
  for (const it of product.setItems ?? []) {
    const p = products.find((x) => x.slug === it.slug);
    if (!p) continue;
    const v = it.variant ? p.variants?.find((x) => x.name === it.variant) : undefined;
    rows.push({
      key: `${it.slug}-${it.variant ?? ""}`,
      p,
      img: v?.image ?? p.gridImage ?? p.image,
      sub: v ? colourName(v.name, locale) : t(locale, { uk: p.taglineUk, en: p.taglineEn, ja: p.taglineJa, ar: p.taglineAr }),
      qty: it.qty,
    });
    for (const key of ["lid", "rubber"] as const) {
      if (!it[key]) continue;
      const a = addonProduct(key);
      if (!a) continue;
      rows.push({ key: `${it.slug}-${key}`, p: a, img: a.gridImage ?? a.image, sub: fitted, qty: it.qty });
    }
  }
  if (!rows.length) return null;

  const title = t(locale, { uk: "У наборі", en: "In the set", ja: "セット内容", ar: "محتويات المجموعة" });

  return (
    <div className="mt-7 pt-5" style={{ borderTop: "1px solid #e5e5e5" }}>
      <p className="text-[12px] tracking-[0.18em] uppercase mb-2" style={{ color: "#707072" }}>{title}</p>
      <ul>
        {rows.map(({ key, p, img, sub, qty }) => {
          const name = locale === "uk" ? p.nameUk : p.nameEn;
          return (
            <li key={key} className="flex items-center gap-4 py-3" style={{ borderTop: "1px solid #f0f0f0" }}>
              <Link href={`/${locale}/products/${p.slug}`} className="shrink-0">
                <Image src={img} alt={name} width={56} height={56} className="w-14 h-14 rounded object-contain p-1" style={{ background: "#f5f5f5" }} />
              </Link>
              <div className="min-w-0">
                <Link href={`/${locale}/products/${p.slug}`} className="text-[15px] font-medium hover:underline" style={{ color: "#111" }}>
                  {name}
                </Link>
                {sub && <div className="text-[13px] mt-0.5" style={{ color: "#707072" }}>{sub}</div>}
              </div>
              <span className="ml-auto text-[13px] tabular-nums" style={{ color: "#707072" }}>×{qty}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
