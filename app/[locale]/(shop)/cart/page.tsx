import CartPageClient from "@/components/cart/CartPageClient";
import { createClient } from "@/lib/supabase/server";
import { rankForUser, GUEST_RANK } from "@/lib/loyalty/rank-server";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return privatePageMetadata(locale, { uk: "Кошик", en: "Your bag", ja: "ショッピングバッグ", ar: "حقيبة التسوق" });
}

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  /* Resolved here so the basket can show the rank perk before checkout. As on
     the checkout page this is display only — create-invoice looks the rank up
     again and prices against that. */
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const { rank } = user && supabase ? await rankForUser(supabase, user.id) : GUEST_RANK;

  return (
    <div style={{ background: "var(--bg)" }}>
      <CartPageClient locale={locale} rankDiscountRate={rank.discountRate} />
    </div>
  );
}
