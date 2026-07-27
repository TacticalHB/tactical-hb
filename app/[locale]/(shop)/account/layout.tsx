import { createClient } from "@/lib/supabase/server";
import AccountNav from "@/components/account/AccountNav";

/**
 * Account shell.
 *
 * No auth redirect here on purpose: /account/favourites is open to guests so
 * they can see their locally-saved hearts and a sign-in CTA. Protected pages
 * (Profile / Orders / Loyalty / Settings) call requireUser() themselves.
 * The sidebar only renders for signed-in users — a guest on the favourites
 * page gets a clean, full-width page instead of nav links they can't use.
 */
export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  return (
    <div className="min-h-screen pt-24 pb-20 page-container" style={{ background: "#ffffff" }}>
      <div className="flex flex-col md:flex-row gap-8 md:gap-12">
        {user && <AccountNav locale={locale} />}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
