"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { CUSTOMER_ORDER_COLUMNS, orderTotalText, timelineFor, toCustomerOrder, type TimelineStep } from "@/lib/account-orders";
import { formatWhen, statusLabel } from "@/lib/orders-display";
import { trackingUrl } from "@/lib/nova-poshta-tracking";
import { ukrposhtaTrackingUrl } from "@/lib/ukrposhta-tracking";
import { carrierName } from "@/lib/shipping-carriers";
import { products } from "@/lib/products";

/* ---------------------------------------------------------------------------
   "Track my order" without an account (Mario, 15 Oct 2026).

   TWO KEYS, BOTH REQUIRED: the order reference AND the email it was placed
   with. Neither alone finds anything, and a miss on either returns the same
   plain "not found", so the form cannot be used to learn whether a reference
   or an address exists.

   ONLY WHAT THE SIGNED-IN ORDER PAGE SHOWS: the customer columns
   (CUSTOMER_ORDER_COLUMNS) plus the carrier and its tracking number. No
   phone, no name, no full address beyond the city and branch the customer
   chose. The email is posted to this action, never put in a URL.
--------------------------------------------------------------------------- */

export type TrackedOrderView = {
  reference: string;
  placed: string;
  status: string;
  cancelled: boolean;
  steps: TimelineStep[] | null;
  total: string;
  totalSub: string | null;
  tracking: { number: string; url: string; carrier: string } | null;
  destination: string | null;
  items: { key: string; name: string; image: string | null; qty: number; detail: string | null }[];
};

export type TrackResult = { ok: true; order: TrackedOrderView } | { ok: false; error: "not_found" | "invalid" };

const REF_RE = /^TCT-[A-Z0-9]{4,12}$/;

export async function trackOrder(rawRef: string, rawEmail: string, locale: string): Promise<TrackResult> {
  let ref = (rawRef ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (ref && !ref.startsWith("TCT-")) ref = `TCT-${ref.replace(/^TCT/, "")}`;
  const email = (rawEmail ?? "").trim().toLowerCase();
  if (!REF_RE.test(ref) || !email.includes("@") || email.length > 254) return { ok: false, error: "invalid" };

  const { data, error } = await createAdminClient()
    .from("orders")
    .select(`${CUSTOMER_ORDER_COLUMNS}, email, shipping_carrier, ukrposhta_barcode`)
    .eq("external_ref", ref)
    .ilike("email", email)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("[track] lookup failed:", error.code, error.message);
    return { ok: false, error: "not_found" };
  }

  const row = data as unknown as Record<string, unknown>;
  const o = toCustomerOrder(row);
  const total = orderTotalText(o);
  const lang = locale === "uk" ? "uk" : "en";
  const barcode = row.ukrposhta_barcode ? String(row.ukrposhta_barcode) : null;
  const tracking = o.ttn
    ? { number: o.ttn, url: trackingUrl(o.ttn), carrier: carrierName("nova_poshta", lang) }
    : barcode
      ? { number: barcode, url: ukrposhtaTrackingUrl(barcode, lang), carrier: carrierName("ukrposhta", lang) }
      : null;

  return {
    ok: true,
    order: {
      reference: o.reference,
      placed: formatWhen(o.createdAt, locale),
      status: statusLabel(o.status, locale),
      cancelled: o.status === "cancelled",
      steps: timelineFor(o.status, locale),
      total: total.text,
      totalSub: total.sub,
      tracking,
      destination: o.destination,
      items: o.items.map((it) => {
        const p = products.find((x) => x.slug === it.slug);
        return {
          key: it.id,
          name: it.name ?? it.slug,
          image: p?.gridImage || p?.image || null,
          qty: it.quantity,
          detail: [it.variant, it.lid ? "Lid 9E418" : null, it.rubber ? "FEAR Stabiliser 9E418" : null].filter(Boolean).join(" · ") || null,
        };
      }),
    },
  };
}
