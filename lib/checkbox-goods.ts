/* ---------------------------------------------------------------------------
   The receipt's arithmetic, and nothing else.

   SPLIT OUT OF lib/checkbox.ts SO IT CAN BE TESTED. That file opens with
   `import "server-only"` and reaches for credentials the moment it is loaded,
   which is correct for something that talks to a fiscal API and fatal for
   anything that wants to check its sums. This half is pure: integers in,
   integers out, no environment, no network, no clock.

   IT IS THE HALF THAT CAN BE WRONG QUIETLY. A failed API call is visible — the
   order shows a fiscal error and somebody fixes it. A receipt that balances to
   the kopiyka while distributing money across the wrong lines is accepted by
   Checkbox, stored by the tax authority, and emailed to the customer, and
   nothing anywhere says a word.
--------------------------------------------------------------------------- */

export class CheckboxBalanceError extends Error {}

export type Json = Record<string, unknown>;

export type FiscalLine = {
  /** Checkbox product code. Absent means this order cannot be fiscalised. */
  code: string;
  name: string;
  qty: number;
  /** Natural per-unit price in kopiyky, before anything is absorbed. */
  unitKop: number;
};

export type FiscalOrder = {
  /** Our order reference — appears on the receipt as the order id. */
  reference: string;
  /** EXACTLY what the card was charged, in kopiyky. The receipt must equal it. */
  amountKop: number;
  lines: FiscalLine[];
  email: string | null;
};

/**
 * Turn priced cart lines into receipt lines whose totals sum to EXACTLY the
 * amount charged.
 *
 * WHAT IS BEING ABSORBED, AND WHY THERE IS ANYTHING TO ABSORB. Shipping has no
 * product of its own — this business sells goods delivered to a destination,
 * not a delivery service, so there is no carriage line to put on a receipt.
 * The HMD lid and ring are the same: real money on the order, no Checkbox
 * product code. Both have to land somewhere, and the only honest somewhere is
 * the goods.
 *
 * SPREAD ACROSS THE UNITS, NOT DROPPED ON ONE LINE. The first version pushed
 * the whole difference onto the most valuable line, on the reasoning that it
 * was the least distorting single place to put it. That is true of a small
 * difference and badly untrue of a large one: a two-line order could print one
 * product at half again its price while the other sat at its catalogue figure.
 * Shipping is paid on the whole parcel, so it belongs on the whole parcel.
 *
 * EXACTNESS IS NOT NEGOTIABLE, so the arithmetic is integer throughout. An even
 * share rarely divides cleanly, and the remainder is handled by SPLITTING one
 * line rather than by rounding a unit price: the split line appears twice,
 * (qty−1) units at the shared rate and one unit carrying the few kopiyky left
 * over. A fiscal receipt that is three kopiyky off the card is worse than one
 * that lists a product twice.
 */
export function buildGoods(order: FiscalOrder): Json[] {
  const natural = order.lines.reduce((s, l) => s + l.unitKop * l.qty, 0);
  const shortfall = order.amountKop - natural;

  const goods: Json[] = order.lines.map((l) => ({
    good: { code: l.code, name: l.name, price: l.unitKop },
    quantity: l.qty * 1000,
  }));

  if (shortfall === 0) return goods;

  const units = order.lines.reduce((s, l) => s + l.qty, 0);
  if (units === 0) return goods;

  /* Per unit, floored — so the shares can only ever be under the shortfall and
     the remainder is positive and small. Math.floor rather than trunc because a
     NEGATIVE shortfall is possible in principle (a discount absorbed the other
     way), and trunc would round it toward zero and leave the remainder larger
     than one unit's share. */
  const share = Math.floor(shortfall / units);
  const remainder = shortfall - share * units;

  const spread: Json[] = order.lines.map((l) => ({
    good: { code: l.code, name: l.name, price: l.unitKop + share },
    quantity: l.qty * 1000,
  }));

  if (remainder === 0) return spread;

  /* The leftover goes on the most valuable line — at most (units − 1) kopiyky,
     so "most valuable" is about tidiness rather than about distortion now. */
  let idx = 0;
  for (let i = 1; i < order.lines.length; i++) {
    if (order.lines[i].unitKop * order.lines[i].qty > order.lines[idx].unitKop * order.lines[idx].qty) idx = i;
  }
  const l = order.lines[idx];
  const shared = l.unitKop + share;

  if (l.qty === 1) {
    spread[idx] = { good: { code: l.code, name: l.name, price: shared + remainder }, quantity: 1000 };
  } else {
    spread[idx] = { good: { code: l.code, name: l.name, price: shared }, quantity: (l.qty - 1) * 1000 };
    spread.push({ good: { code: l.code, name: l.name, price: shared + remainder }, quantity: 1000 });
  }
  return spread;
}

/** The guard that makes a wrong quantity convention impossible to send. */
export function assertBalanced(goods: Json[], amountKop: number): void {
  const total = goods.reduce((s, g) => {
    const price = (g.good as { price: number }).price;
    const qty = g.quantity as number;
    return s + (price * qty) / 1000;
  }, 0);
  if (!Number.isInteger(total) || total !== amountKop) {
    throw new CheckboxBalanceError(
      `receipt would not balance: goods ${total} ≠ charged ${amountKop} kop — refusing to fiscalise`
    );
  }
}
