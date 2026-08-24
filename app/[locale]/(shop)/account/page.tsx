import Link from "next/link";
import { t } from "@/lib/i18n-text";
import { requireUser } from "@/lib/supabase/require-user";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { supabase, user } = await requireUser(locale);

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, surname, created_at")
    .eq("id", user.id)
    .single();

  const name = profile?.first_name
    ? `${profile.first_name}${profile.surname ? " " + profile.surname : ""}`
    : user.email;
  const initial = (profile?.first_name?.[0] || user.email?.[0] || "?").toUpperCase();

  const memberSince = new Date(profile?.created_at || user.created_at).toLocaleDateString(
    t(locale, { uk: "uk-UA", en: "en-GB", ja: "ja-JP", ar: "ar-u-nu-latn" }),
    { month: "long", year: "numeric" }
  );

  const cards = [
    { href: `/${locale}/account/loyalty`, title: t(locale, { uk: "Бонуси", en: "Loyalty", ja: "ロイヤルティ", ar: "الولاء" }), desc: t(locale, { uk: "XP, прогрес та ваучери", en: "XP, progress & vouchers", ja: "XP、進捗、バウチャー", ar: "نقاط الخبرة والتقدّم والقسائم" }) },
    { href: `/${locale}/account/orders`, title: t(locale, { uk: "Замовлення", en: "Orders", ja: "ご注文", ar: "الطلبات" }), desc: t(locale, { uk: "Історія покупок", en: "Your purchase history", ja: "購入履歴", ar: "سجل مشترياتك" }) },
    { href: `/${locale}/account/favourites`, title: t(locale, { uk: "Обране", en: "Favourites", ja: "お気に入り", ar: "المفضّلة" }), desc: t(locale, { uk: "Збережені товари", en: "Saved products", ja: "保存した製品", ar: "المنتجات المحفوظة" }) },
  ];

  return (
    <div>
      <div className="flex items-center gap-5 mb-12">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold shrink-0"
          style={{ background: "var(--bg-soft)", color: "var(--ink)" }}
        >
          {initial}
        </div>
        <div>
          <h1 className="text-3xl font-semibold" style={{ color: "#111" }}>{name}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {t(locale, { uk: "Учасник Tactical HB з", en: "Tactical HB member since", ja: "Tactical HB 会員登録日", ar: "عضو في Tactical HB منذ" })} {memberSince}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-2xl border p-6 transition-colors hover:border-black"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="text-lg font-medium" style={{ color: "#111" }}>{c.title}</div>
            <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{c.desc}</div>
            <div className="text-sm mt-4" style={{ color: "#111" }}>→</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
