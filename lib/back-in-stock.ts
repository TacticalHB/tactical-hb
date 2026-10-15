import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { products, availabilityOf, type Product } from "@/lib/products";
import { sendMail, esc } from "@/lib/email";
import { INK, MUTED, FAINT, ACCENT_FILL, FONT, emailShell } from "@/lib/email-theme";
import { SITE_URL } from "@/lib/seo";

/* ---------------------------------------------------------------------------
   "Tell me when it's back" (Mario, 15 Oct 2026). Table: migration 0044.

   ASKING is open to anyone on a product page that cannot be bought today —
   sold out, coming soon, or not yet arrived. TELLING happens in the daily
   email cron: every waiting request whose product is on sale again gets one
   short mail, then notified_at is stamped so it never goes twice.

   A product counts as back when availabilityOf() says "available" or
   "preorder" — the moment it can be put in a basket. Restocking is still a
   catalogue change (soldOut off) and a deploy; the next morning's run tells
   everyone who asked.
--------------------------------------------------------------------------- */

export type NotifyResult = "ok" | "already" | "invalid" | "available" | "no_table" | "failed";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const canBuy = (p: Product) => ["available", "preorder"].includes(availabilityOf(p));

export async function requestBackInStock(rawEmail: string, slug: string, locale: string): Promise<NotifyResult> {
  const email = (rawEmail ?? "").trim().toLowerCase().slice(0, 254);
  if (!EMAIL_RE.test(email)) return "invalid";
  const product = products.find((p) => p.slug === slug);
  if (!product) return "invalid";
  if (canBuy(product)) return "available";

  const { error } = await createAdminClient()
    .from("back_in_stock_requests")
    .insert({ email, product_slug: slug, locale: ["uk", "en", "ja", "ar"].includes(locale) ? locale : "en" });
  if (!error) return "ok";
  if (error.code === "23505") return "already"; // the waiting-once unique index
  if (error.code === "42P01" || /does not exist/i.test(error.message)) {
    console.error("[back-in-stock] table missing — run migration 0044");
    return "no_table";
  }
  console.error("[back-in-stock] insert failed:", error.code, error.message);
  return "failed";
}

const COPY = {
  uk: {
    subject: (n: string) => `${n} знову в наявності`,
    headline: (n: string) => `${n} знову в наявності.`,
    intro: "Ви просили повідомити, коли цей товар повернеться. Він уже на сайті — і його можна замовити.",
    cta: "Переглянути товар",
    small: "Ви отримали цей лист, бо залишили адресу на сторінці товару. Більше листів про нього не буде.",
  },
  en: {
    subject: (n: string) => `${n} is back in stock`,
    headline: (n: string) => `${n} is back.`,
    intro: "You asked us to tell you when this returned. It is on the site now, ready to order.",
    cta: "View the product",
    small: "You are receiving this because you left your address on the product page. This is the only email about it.",
  },
};

function buildEmail(p: Product, locale: string) {
  const lang = locale === "uk" ? "uk" : "en";
  const t = COPY[lang];
  const name = lang === "uk" ? p.nameUk : p.nameEn;
  const urlLocale = ["uk", "en", "ja", "ar"].includes(locale) ? locale : "en";
  const url = `${SITE_URL}/${urlLocale}/products/${p.slug}`;
  const inner = `
        <tr><td align="center" style="padding-bottom:12px">
          <h1 style="margin:0;font-family:${FONT};font-size:27px;line-height:1.25;font-weight:700;color:${INK}">${esc(t.headline(name))}</h1>
        </td></tr>
        <tr><td align="center" style="padding-bottom:26px">
          <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.6;color:${MUTED};max-width:440px">${esc(t.intro)}</p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:28px">
          <a href="${esc(url)}" style="display:inline-block;font-family:${FONT};font-size:15px;font-weight:600;color:#111114;background:${ACCENT_FILL};text-decoration:none;padding:13px 30px;border-radius:999px">${esc(t.cta)}</a>
        </td></tr>
        <tr><td align="center">
          <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${FAINT};max-width:440px">${esc(t.small)}</p>
        </td></tr>`;
  return {
    subject: t.subject(name),
    html: emailShell({ lang, title: esc(t.subject(name)), inner }),
    text: [t.headline(name), "", t.intro, "", `${t.cta}: ${url}`, "", t.small].join("\n"),
  };
}

/**
 * Tell everyone whose product is back. Called by the daily email cron.
 * Stamps each row before moving on, so a failure halfway leaves the rest for
 * tomorrow rather than mailing anyone twice.
 */
export async function runBackInStock(limit = 50): Promise<{ sent: number; waiting: number }> {
  const backNow = products.filter(canBuy).map((p) => p.slug);
  if (backNow.length === 0) return { sent: 0, waiting: 0 };
  const db = createAdminClient();
  const { data, error } = await db
    .from("back_in_stock_requests")
    .select("id, email, product_slug, locale")
    .is("notified_at", null)
    .in("product_slug", backNow)
    .limit(limit);
  if (error) {
    if (!/does not exist/i.test(error.message)) console.error("[back-in-stock] read failed:", error.message);
    return { sent: 0, waiting: 0 };
  }
  let sent = 0;
  for (const row of data ?? []) {
    const p = products.find((x) => x.slug === row.product_slug);
    if (!p) continue;
    const mail = buildEmail(p, String(row.locale));
    const res = await sendMail({ to: String(row.email), subject: mail.subject, html: mail.html, text: mail.text });
    if (!res.ok) {
      console.error("[back-in-stock] send failed for", row.product_slug, res.error);
      continue;
    }
    await db.from("back_in_stock_requests").update({ notified_at: new Date().toISOString() }).eq("id", row.id);
    sent++;
  }
  return { sent, waiting: (data ?? []).length - sent };
}
