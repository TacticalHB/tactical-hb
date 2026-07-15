import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const uk = locale === "uk";
  const supabase = await createClient();
  // layout already guards auth; supabase is available here
  const {
    data: { user },
  } = await supabase!.auth.getUser();

  const { data: profile } = await supabase!
    .from("profiles")
    .select("first_name, surname, created_at")
    .eq("id", user!.id)
    .single();

  const name = profile?.first_name
    ? `${profile.first_name}${profile.surname ? " " + profile.surname : ""}`
    : user!.email;
  const initial = (profile?.first_name?.[0] || user!.email?.[0] || "?").toUpperCase();

  const memberSince = new Date(profile?.created_at || user!.created_at).toLocaleDateString(
    uk ? "uk-UA" : "en-GB",
    { month: "long", year: "numeric" }
  );

  const cards = [
    { href: `/${locale}/account/loyalty`, title: uk ? "Бонуси" : "Loyalty", desc: uk ? "XP, прогрес та ваучери" : "XP, progress & vouchers" },
    { href: `/${locale}/account/orders`, title: uk ? "Замовлення" : "Orders", desc: uk ? "Історія покупок" : "Your purchase history" },
    { href: `/${locale}/account/favourites`, title: uk ? "Обране" : "Favourites", desc: uk ? "Збережені товари" : "Saved products" },
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
            {uk ? "Учасник Tactical HB з" : "Tactical HB member since"} {memberSince}
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
