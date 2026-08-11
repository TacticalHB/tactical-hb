import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import AccountNav from "@/components/account/AccountNav";
import { rankForUser } from "@/lib/loyalty/rank-server";

/**
 * The whole account area is never indexed — profile, orders, loyalty,
 * favourites and settings alike.
 *
 * app/robots.ts disallows these paths too, but the two do different jobs:
 * robots stops a crawler FETCHING the page, while noindex stops the URL being
 * listed at all, and a disallowed URL can still be indexed on the strength of
 * an external link alone. Nothing under here is meaningful to anyone but the
 * one person signed in, and an order page listed in a search result would be
 * alarming even though the page itself refuses to render for a stranger.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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

  /* The nav shows the rank as a small mark beside Loyalty. Resolved here
     because this layout already holds both the client and the user — the
     alternative was a second round trip from a client component. */
  const rank = user && supabase ? (await rankForUser(supabase, user.id)).rank : null;

  return (
    <div className="min-h-screen pt-24 pb-20 page-container" style={{ background: "#ffffff" }}>
      <div className="flex flex-col md:flex-row gap-8 md:gap-12">
        {user && <AccountNav locale={locale} rank={rank} />}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
