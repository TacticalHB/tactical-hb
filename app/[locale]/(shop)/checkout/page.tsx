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

  /* KEYED ON THE LOCALE, which is how the shipping state is guaranteed to be
     dropped when someone moves between /uk/checkout and /en/checkout.

     The two storefronts ship to different places (see lib/shipping-locale), so
     a Nova Poshta branch chosen on the Ukrainian side means nothing on the
     English one and a German quote means nothing on the Ukrainian one. Both
     have to go, along with the carrier and the country that produced them.

     A key rather than an effect that clears each field. Changing it discards
     the instance outright, so there is no list of state to keep in step with
     the component — a field added later is covered without anyone remembering
     to add it. App Router will usually remount here anyway; usually is not a
     guarantee, and the failure it would produce is a quote from the wrong
     country surviving into an invoice. */
  return (
    <CheckoutClient key={locale} locale={locale} rankDiscountRate={rank.discountRate} />
  );
}
