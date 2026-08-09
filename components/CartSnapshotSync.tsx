"use client";

import { useEffect, useRef } from "react";
import { useCart } from "./CartContext";

/* ---------------------------------------------------------------------------
   Tells the server what is in the bag, so it can be recovered later.

   Renders nothing. It exists because the cart is localStorage and the recovery
   mail is written three days after the browser has gone.

   IT POSTS THE COMPOSITION, NOT THE KEYSTROKES. Two guards: the bag is
   compared to the last thing successfully sent, so navigating between pages
   re-mounts this and sends nothing; and a change waits out a quiet period
   before going, so nudging a quantity from one to four is one request rather
   than four. Every post resets the +1h/+24h/+72h anchor server-side, which is
   exactly why it must not fire on every intermediate state — a customer
   fiddling with a spinner would otherwise keep pushing their own mail back.

   THE FIRST STATE AFTER HYDRATION IS STILL SENT, unlike the suggestion card's
   dismissal tracker, which treats it as a baseline. The reason they differ:
   restoring a saved bag on page load is not a new decision about what to buy,
   but it IS the most recent evidence of what the bag contains, and the server
   may be holding something older.

   QUANTITY COUNTS HERE. It is part of what the mail will describe and part of
   what the customer would be returning to, so changing it is a real change.

   NO ADDRESS IS SENT. The route resolves the customer from their session and
   ignores anything else — see app/api/cart/snapshot/route.ts for why.
--------------------------------------------------------------------------- */

/** Long enough to cover a burst of edits, short enough to survive the tab. */
const QUIET_MS = 4000;

export default function CartSnapshotSync({ locale }: { locale: string }) {
  const { lines, hydrated } = useCart();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;

    const payload = lines.map((l) => ({
      slug: l.slug,
      qty: l.qty,
      options: l.options ?? {},
    }));
    const signature = JSON.stringify(payload);
    if (signature === lastSent.current) return;

    const timer = setTimeout(() => {
      // keepalive so a post fired as the customer navigates away still lands —
      // leaving is precisely the moment this matters most.
      fetch("/api/cart/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: payload, locale }),
        keepalive: true,
      })
        .then(() => {
          lastSent.current = signature;
        })
        .catch(() => {
          /* Offline or blocked: leave lastSent alone so the next change retries. */
        });
    }, QUIET_MS);

    return () => clearTimeout(timer);
  }, [lines, hydrated, locale]);

  return null;
}
