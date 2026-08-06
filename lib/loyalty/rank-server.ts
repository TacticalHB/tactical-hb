import { rankForSpend, RANKS, type Rank, type Spend } from "./ranks";
import { eurToUahFixed } from "@/lib/currency";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ---------------------------------------------------------------------------
   Reading a customer's rank on the server.

   Kept apart from ranks.ts on purpose: that module is pure and gets imported
   by client components for the labels and the ladder, so it must never pull a
   database client in behind it. This is the one place that touches Supabase.

   THE SPEND QUERY IS THE SAME ONE THE LOYALTY PAGE RUNS — sum of amount_eur
   over the user's own orders — so the rank shown on the rewards card and the
   rank the checkout charges against cannot disagree. Under RLS this only ever
   sees the caller's own rows.
--------------------------------------------------------------------------- */

export type UserRank = { rank: Rank; lifetime: Spend };

/** Everyone starts here — guests, and anyone whose spend cannot be read. */
export const GUEST_RANK: UserRank = { rank: RANKS[0], lifetime: { eur: 0, uah: 0 } };

/** Both columns, because a rank needs both scales — see lib/loyalty/ranks. */
export const SPEND_COLUMNS = "amount_eur, amount_uah";

/**
 * Sum a set of order rows into lifetime spend.
 *
 * amount_uah is nullable — it arrived with the dual-currency columns in 0008,
 * so anything written before that has only a euro figure. Those fall back to
 * the fixed invoice rate, which is what such an order would have been billed
 * at, rather than being counted as zero hryvnia and quietly holding a
 * long-standing customer back from a rank.
 */
export function sumSpend(rows: Array<{ amount_eur: unknown; amount_uah?: unknown }>): Spend {
  return rows.reduce<Spend>(
    (acc, o) => {
      const eur = Number(o.amount_eur ?? 0) || 0;
      const uah = o.amount_uah == null ? eurToUahFixed(eur) : Number(o.amount_uah) || 0;
      return { eur: acc.eur + eur, uah: acc.uah + uah };
    },
    { eur: 0, uah: 0 }
  );
}

export async function rankForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<UserRank> {
  const { data, error } = await supabase
    .from("orders")
    .select(SPEND_COLUMNS)
    .eq("user_id", userId);

  /* A failed read must not silently promote or demote anyone. Falling back to
     Recruit means the worst case is a Colonel paying full price on one order,
     which is recoverable; the opposite — handing out 7% on a bad read — is
     money out of the door. */
  if (error || !data) return GUEST_RANK;

  const lifetime = sumSpend(data as Array<{ amount_eur: unknown; amount_uah?: unknown }>);
  return { rank: rankForSpend(lifetime), lifetime };
}
