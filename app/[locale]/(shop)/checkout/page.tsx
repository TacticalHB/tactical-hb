import CheckoutClient from "@/components/checkout/CheckoutClient";
import { createClient } from "@/lib/supabase/server";
import { rankForUser, GUEST_RANK } from "@/lib/loyalty/rank-server";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  /* The rank is resolved here, on the server, purely so the summary can SHOW
     the perk before payment. It is not what applies it — create-invoice looks
     the same rank up again from the same table and prices against that, so a
     tampered prop changes the wording on screen and nothing about the charge. */
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const { rank } = user && supabase ? await rankForUser(supabase, user.id) : GUEST_RANK;

  return <CheckoutClient locale={locale} rankDiscountRate={rank.discountRate} />;
}
