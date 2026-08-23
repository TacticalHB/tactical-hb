"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { products } from "@/lib/products";
import { getCartSuggestion } from "@/lib/cart-suggestion";
import { describeAddons } from "@/lib/cart-display";
import { useCart, lineKey, linePrice } from "./CartContext";
import Price from "./Price";

/* ---------------------------------------------------------------------------
   The pairing card in the cart drawer — "you have the bowl, here is the heat".

   IT IS NOT AN AD, IT IS THE NEXT PIECE. The poster is artwork only: the name,
   the price and both buttons are real components underneath it, so the price a
   customer reads is the price the cart will charge, in their own currency, and
   the button is a button rather than a picture of one.

   DISMISSAL IS PER PAIRING, PER SESSION. Turning down a heat device should not
   also silence the wind cover suggestion later, so the key is the pairing and
   not the card. sessionStorage rather than localStorage on purpose: a decision
   made while shopping should not follow someone around for weeks.

   IT NEVER SELLS AN OPTION NOBODY CHOSE. A suggested device is the base SKU —
   most product pages preselect a lid and a ring, and quietly charging for
   those here would be putting two upgrades in the bag that were never shown.
   The one exception is the timer, which IS the suggestion, and even then it
   upgrades the cover already in the bag instead of adding a second one.
--------------------------------------------------------------------------- */

const DISMISS_PREFIX = "tct-suggest-dismissed:";

/* Two of these can be on screen at once — one in the bag drawer, one in the
   post-add panel that sits above it. Each keeps its own dismissed list in
   state, so a dismissal in one would leave the other still offering the thing
   that was just turned down until something happened to remount it. The event
   is how they stay in step: whoever dismisses tells everyone. */
const DISMISS_EVENT = "tct:suggest-dismissed";

export default function CartSuggestion({
  locale,
  cta = "strong",
}: {
  locale: string;
  /**
   * How much weight the Add button carries.
   *
   * "strong" is the accent fill, right for the bag drawer where the only other
   * primary is pinned in the footer well away from it.
   *
   * "quiet" is the dark fill used by the product page's own add button, for
   * the post-add panel — there the accent already belongs to "View your
   * shopping bag" a few pixels above, and a second orange pill beside it reads
   * as two competing primaries rather than an offer inside a card.
   */
  cta?: "strong" | "quiet";
}) {
  const t = useTranslations("cart");
  const { lines, lastAdded, addToCart, setLineOptions, setCartOpen, setAddedOpen, hydrated } = useCart();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  /* Unique per instance: the drawer and the post-add panel can both be mounted,
     and two elements sharing one id is invalid markup that would also point
     both aria-labelledby references at whichever heading won. */
  const headingId = useId();
  /* The bag's composition as a string. QUANTITY IS LEFT OUT ON PURPOSE: a
     dismissal should survive someone nudging a line from one to two, which is
     not a new decision about what to buy — only a line appearing or leaving,
     or its options changing, is. */
  const composition = useMemo(
    () =>
      lines
        .map((l) => `${l.slug}|${JSON.stringify(l.options ?? {})}`)
        .sort()
        .join(","),
    [lines]
  );
  const seenComposition = useRef<string | null>(null);

  /* Read the session's dismissals once. Done in an effect rather than in the
     initial state so the server and the first client render agree — reading
     storage during render is a hydration mismatch waiting to happen. */
  useEffect(() => {
    try {
      const keys = Object.keys(sessionStorage).filter((k) => k.startsWith(DISMISS_PREFIX));
      setDismissed(keys.map((k) => k.slice(DISMISS_PREFIX.length)));
    } catch {
      /* Private mode with storage disabled: the card simply never remembers. */
    }

    const onDismissed = (e: Event) => {
      const key = (e as CustomEvent<string>).detail;
      setDismissed((d) => (d.includes(key) ? d : [...d, key]));
    };
    window.addEventListener(DISMISS_EVENT, onDismissed);
    return () => window.removeEventListener(DISMISS_EVENT, onDismissed);
  }, []);

  /* A "no thanks" lasts until the bag changes, not until the tab closes.
     Turning down a heat device beside one bowl says little about what to
     suggest once something else has gone in, and the old behaviour meant one
     dismissal silenced that pairing for the rest of the visit.

     The first composition seen after hydration is the baseline, not a change —
     without that, restoring a saved cart on page load would read as a change
     and wipe dismissals on every navigation. Both mounted copies run this
     independently and land on the same answer, so no broadcast is needed. */
  useEffect(() => {
    if (!hydrated) return;
    if (seenComposition.current === null) {
      seenComposition.current = composition;
      return;
    }
    if (seenComposition.current === composition) return;
    seenComposition.current = composition;

    try {
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith(DISMISS_PREFIX))
        .forEach((k) => sessionStorage.removeItem(k));
    } catch {}
    setDismissed([]);
  }, [composition, hydrated]);

  const suggestion = useMemo(() => getCartSuggestion(lines, lastAdded), [lines, lastAdded]);

  if (!suggestion) return null;
  if (dismissed.includes(suggestion.pairingKey)) return null;

  const product = products.find((p) => p.slug === suggestion.slug);
  if (!product) return null;

  const name = locale === "uk" ? product.nameUk : product.nameEn;
  /* Priced through the cart's own linePrice with the options the button will
     actually apply, so an upgrade quotes the cover WITH its timer rather than
     the bare cover's price. */
  const price = linePrice({ slug: suggestion.slug, qty: 1, options: suggestion.options });

  /* THE CARD HAS TO NAME THE CONFIGURATION, because the price already reflects
     it. The wind cover is suggested with its timer on — deliberately, it is
     what the poster sells — so this card quoted €45 against a product whose
     catalogue price is €23, under a name that said only "Windcover
     Detonator". Nothing on the card explained the gap, so it read as either a
     mistake or a markup. The price was never wrong; the label was incomplete.

     Through describeAddons, so it is word-for-word what the bag will call the
     same line thirty seconds later. */
  const addons = describeAddons(suggestion.options, locale);

  /* Navigating away with the overlay still up would land the customer on the
     product page behind a drawer. Both surfaces close, because either could be
     the one that is open. */
  const leave = () => {
    setCartOpen(false);
    setAddedOpen(false);
  };

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_PREFIX + suggestion.pairingKey, "1");
    } catch {}
    setDismissed((d) => [...d, suggestion.pairingKey]);
    /* Tell the other copy, so turning the card down in the post-add panel also
       clears it from the bag drawer sitting behind. */
    window.dispatchEvent(new CustomEvent(DISMISS_EVENT, { detail: suggestion.pairingKey }));
  };

  const accept = () => {
    setFailed(false);
    try {
      if (suggestion.upgradesLineKey) {
        /* The timer case. Find the exact line the customer just added and
           re-configure it — adding would leave them with two covers. */
        const target = lines.find(
          (l) => l.slug === suggestion.slug && !l.options?.timer
        );
        if (!target) {
          setFailed(true);
          return;
        }
        setLineOptions(lineKey(target.slug, target.options), suggestion.options ?? {});
      } else {
        addToCart(product, null, suggestion.options, false);
      }
    } catch {
      /* Keep the card and say so — never clear the bag on a failure. */
      setFailed(true);
    }
  };

  return (
    <section
      className="cart-suggest mt-6 mb-2 overflow-hidden rounded-[14px]"
      style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
      aria-labelledby={headingId}
    >
      <h3
        id={headingId}
        className="px-4 pt-3.5 pb-2.5 text-[10px] tracking-[0.24em] uppercase"
        style={{ color: "var(--text-faint)" }}
      >
        {t("suggest_heading")}
      </h3>

      {/* THE POSTER AND THE NAME ARE THE LINK, and the buttons sit outside it
          rather than inside. A <button> nested in an <a> is invalid markup
          that browsers and screen readers resolve differently, so the usual
          fix — a full-card link with stopPropagation on every control — is
          working around a structure that did not have to exist. Splitting them
          means a click can only ever mean one thing, with nothing to cancel.

          The artwork is decorative: the link's own text names the product, so
          an alt would say it twice. */}
      <Link
        href={`/${locale}/products/${suggestion.slug}`}
        onClick={leave}
        className="cart-suggest-link block"
      >
        <Image
          src={suggestion.poster}
          alt=""
          width={800}
          height={800}
          sizes="384px"
          className="block w-full h-auto"
        />
        <div className="px-4 pt-3.5 flex items-baseline justify-between gap-3">
          <span className="text-[14px]" style={{ color: "var(--text)" }}>{name}</span>
          <span className="text-[14px] font-medium shrink-0" style={{ color: "var(--text)" }}>
            <Price money={price} locale={locale} />
          </span>
        </div>
        {addons && (
          <div className="px-4 pt-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
            {addons}
          </div>
        )}
      </Link>

      <div className="px-4 pb-3.5 pt-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={accept}
            className="flex-1 h-10 rounded-full text-[14px] font-medium transition-opacity hover:opacity-85"
            style={
              cta === "quiet"
                ? { background: "#111114", color: "#ffffff" }
                : { background: "var(--accent)", color: "#111114" }
            }
          >
            {t("suggest_add")}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="h-10 px-3.5 text-[13px] transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            {t("suggest_dismiss")}
          </button>
        </div>

        {failed && (
          <p className="text-[12px] mt-2.5" style={{ color: "var(--accent-ink)" }}>
            {t("suggest_error")}
          </p>
        )}

        <Link
          href={`/${locale}/setup`}
          onClick={leave}
          className="inline-flex items-center min-h-11 mt-1 text-[12px] underline underline-offset-4"
          style={{ color: "var(--text-muted)" }}
        >
          {t("suggest_build")}
        </Link>
      </div>
    </section>
  );
}
