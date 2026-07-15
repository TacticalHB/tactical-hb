import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient();
  if (!supabase) redirect(`/${locale}/login`);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, surname")
    .eq("id", user.id)
    .single();

  const uk = locale === "uk";
  const name = profile?.first_name || (uk ? "учаснику" : "there");

  return (
    <div className="min-h-screen pt-28 px-6 max-w-5xl mx-auto" style={{ background: "#ffffff" }}>
      <h1 className="text-4xl font-semibold" style={{ color: "#111" }}>
        {uk ? `Вітаємо, ${name}` : `Hi, ${name}`}
      </h1>
      <p className="mt-3 text-sm" style={{ color: "#707072" }}>
        {uk
          ? "Панель акаунта (Профіль, Замовлення, Обране, Бонуси, Налаштування) — на наступному кроці."
          : "Your account dashboard (Profile, Orders, Favourites, Loyalty, Settings) is coming in the next step."}
      </p>
    </div>
  );
}
