"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/CartContext";
import { useAuth } from "@/components/AuthContext";
import { money, moneyFromUah, subtractMoney } from "@/lib/currency";
import { chooseDiscount, permanentDiscount } from "@/lib/loyalty/ranks";
import VoucherField, { type AppliedVoucher } from "./VoucherField";
import NovaPoshtaPicker, { type NovaPoshtaSelection } from "./NovaPoshtaPicker";
import { countryOptions, countryName, isBlockedManualCountry, OTHER } from "@/lib/countries";
import {
  countryAllowedOn,
  destinationForLocale,
  wrongStorefrontMessage,
  otherStorefrontPath,
  LOCALE_SHIPPING_MISMATCH,
} from "@/lib/shipping-locale";
import { saveOrder, type DeliveryDetails, type OrderLine } from "@/lib/checkout";
import { describeLine } from "@/lib/cart-display";
import { priceCart } from "@/lib/pricing";
import CheckoutHeader, { type Step } from "./CheckoutHeader";
import OrderSummaryPanel from "./OrderSummaryPanel";
import Price from "@/components/Price";
import {
  carrierName,
  isShippingCarrier,
  type ShippingCarrier,
} from "@/lib/shipping-carriers";
import AccountCreatingScreen from "./AccountCreatingScreen";

/* ---------------------------------------------------------------------------
   Multi-step checkout: identification → delivery → payment.

   Identification comes FIRST, as on Louis Vuitton: the shopper says who they
   are (guest or account) before filling in an address, so the account decision
   isn't buried under a long form.

   Guest checkout is the default path; an account is offered, never required.

   NO CARD FIELDS. Monobank Plata is a hosted checkout — card details are
   entered on Monobank's page, never ours. The payment step chooses a method
   and nothing more, which is the correct integration shape and keeps us
   entirely out of PCI scope.
--------------------------------------------------------------------------- */

type Identity = "guest" | "account";

/**
 * A selectable identity card (guest / create account).
 *
 * AT MODULE SCOPE, not inside the checkout. Declared in the component body it
 * was a NEW component type on every render, so React could not match it to the
 * previous tree and remounted both cards each time anything in checkout
 * changed — losing focus on the way. The state it used to close over is passed
 * in instead, which is all it ever needed.
 */
function IdentityOption({
  id,
  title,
  note,
  active,
  onSelect,
}: {
  id: Identity;
  title: string;
  note: string;
  active: boolean;
  onSelect: (id: Identity) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={() => onSelect(id)}
      className="w-full flex items-start gap-3.5 p-5 text-left transition-colors"
      style={{ border: active ? "1px solid var(--ink)" : "1px solid var(--border-strong)", background: "var(--field-bg)" }}
    >
      <span
        className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ border: `1px solid ${active ? "var(--ink)" : "var(--border-strong)"}` }}
      >
        {active && <span className="w-2 h-2 rounded-full" style={{ background: "var(--ink)" }} />}
      </span>
      <span>
        <span className="block text-[15px]" style={{ color: "var(--text)", fontWeight: active ? 500 : 400 }}>{title}</span>
        <span className="block text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>{note}</span>
      </span>
    </button>
  );
}

export default function CheckoutClient({
  locale,
  rankDiscountRate = 0,
}: {
  locale: string;
  /** The signed-in customer's permanent rank discount — 0.07 for Colonel, 0
      for everyone else. Display only; the server prices it independently. */
  rankDiscountRate?: number;
}) {
  const uk = locale === "uk";
  const router = useRouter();
  const { lines, subtotal, clearCart, hydrated } = useCart();
  const { user, profile } = useAuth();

  const [step, setStep] = useState<Step>("identification");
  const [identity, setIdentity] = useState<Identity>("guest");
  const [showAccount, setShowAccount] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  // Ukrainian shoppers get the country code pre-filled; English-language
  // visitors may be anywhere, so they only get the "+".
  const [form, setForm] = useState<DeliveryDetails>({
    email: "", firstName: "", surname: "", phone: uk ? "+380" : "+",
    address: "", apartment: "", city: "", postcode: "", country: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [voucher, setVoucher] = useState<AppliedVoucher | null>(null);

  /* WHERE THIS STOREFRONT SHIPS — derived, never chosen. /uk delivers inside
     Ukraine, /en outside it, and the customer has no control to change that
     because there is nothing to decide: each shop has one delivery model. The
     destination radio group that used to sit here is gone with it. See
     lib/shipping-locale, which the server reads from too. */
  const destination = destinationForLocale(locale);
  const [np, setNp] = useState<NovaPoshtaSelection | null>(null);
  // The chosen country code, "OTHER", or "" (nothing picked yet). Address
  // fields stay hidden until this is set. form.country holds the resolved name.
  const [countryCode, setCountryCode] = useState("");
  /* UKRAINE IS NOT AN INTERNATIONAL DESTINATION. On /en it is removed from the
     list outright rather than left in to be rejected later — an option that
     cannot be used is worse than no option, because the customer only finds
     out after filling in an address. On /uk the list is unused; the branch
     picker takes its place. */
  const countries = useMemo(
    () => countryOptions(locale).filter((c) => countryAllowedOn(locale, c.code)),
    [locale]
  );

  /* What the carriers will charge to carry this basket to the chosen country.
     `offers` is empty + unsupported=false means "not asked yet or still
     asking"; unsupported=true means NEITHER carrier will go there, and the
     order becomes a request priced by hand instead of a payment taken now.

     TWO CARRIERS NOW, so this holds a list rather than one number. The route
     returns them cheapest-first and the cheapest is preselected — a customer
     who does not care about carriers should not have to have an opinion to
     reach the payment step. */
  const [intl, setIntl] = useState<{
    offers: { carrier: ShippingCarrier; costUah: number }[];
    unsupported: boolean;
    loading: boolean;
  }>({ offers: [], unsupported: false, loading: false });

  /* Which carrier the customer is buying. Null until offers arrive, then the
     cheapest, then whatever they pick. Kept separate from `offers` so that a
     re-quote — a basket change, a different country — refreshes the prices
     without silently swapping the carrier under someone who chose one. */
  const [carrier, setCarrier] = useState<ShippingCarrier | null>(null);

  /** The offer being charged for: their choice, else the cheapest. */
  const selectedOffer =
    intl.offers.find((o) => o.carrier === carrier) ?? intl.offers[0] ?? null;

  /* A voucher is denominated in EUR; money() converts it for the UAH side.
     The rank perk is worked out from the live basket, and the two are put
     through the SAME chooseDiscount the invoice route uses — so the figure on
     screen is arrived at by the same rule that will charge the card, rather
     than by a second implementation that could drift from it. */
  const perk = permanentDiscount(rankDiscountRate, subtotal);
  const chosen = chooseDiscount(voucher ? money(voucher.amountEur) : null, perk);
  const discount = chosen.amount;
  const discountSource = chosen.source;
  const goods = subtractMoney(subtotal, discount);

  /* Both carriers quote shipping in hryvnia; OrderSummaryPanel converts the
     quote to the display currency and folds it into the one order total.
     International is priced by Nova Post's cross-border API where it carries;
     where it does not, there is no rate to show and the exact total is
     confirmed by email before any payment instead. */

  /** True when this order will be emailed a total rather than paid for now. */
  const isIntlRequest = destination === "international" && (intl.unsupported || selectedOffer == null);

  /* A voucher applied to one basket must not survive a change to that basket —
     its minimum-order rule was checked against the old contents.

     ADJUSTED DURING RENDER, which is React's own answer to "reset state when
     an input changes" and is not the same thing as an effect. An effect would
     paint the stale voucher first and correct it on the next frame, so a
     customer removing the item that qualified them would see the discount
     linger for a beat. This drops it before anything is shown, and React
     restarts the render immediately without committing the discarded one. */
  const [voucherBasket, setVoucherBasket] = useState(lines);
  if (voucherBasket !== lines) {
    setVoucherBasket(lines);
    if (voucher) setVoucher(null);
  }

  /* Price the international leg whenever the destination country or the basket
     changes. Display only — create-invoice re-quotes server-side, so a figure
     tampered with here cannot become the amount charged.

     "OTHER" is the free-text country, which has no ISO code to price by, so it
     stays on the request path. A stale response is discarded: switching country
     twice quickly must not let the first answer overwrite the second. */
  useEffect(() => {
    let live = true;

    /* Every state update sits inside this async body on purpose. Setting state
       synchronously in an effect makes React render twice before paint, and the
       lint rule that catches it is worth keeping clean rather than adding to. */
    (async () => {
      if (destination !== "international" || !countryCode || countryCode === OTHER) {
        if (live) {
          setIntl({ offers: [], unsupported: false, loading: false });
          setCarrier(null);
        }
        return;
      }

      if (live) setIntl({ offers: [], unsupported: false, loading: true });

      try {
        const res = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            /* The server refuses a country this storefront may not ship to,
               so it has to be told which storefront is asking. */
            locale,
            countryCode,
            city: form.city,
            lines: lines.map((l) => ({ slug: l.slug, qty: l.qty, options: l.options })),
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          offers?: { carrier?: string; costUah?: number }[];
          unsupported?: boolean;
        };
        if (!live) return;

        /* Only offers with a real carrier name and a real number survive. The
           response is server-built, but this is the value a customer is about
           to be charged, so it is validated rather than trusted in shape. */
        const offers = (data.offers ?? []).flatMap((o) =>
          isShippingCarrier(o.carrier) && typeof o.costUah === "number" && o.costUah > 0
            ? [{ carrier: o.carrier, costUah: o.costUah }]
            : []
        );

        if (data.ok && offers.length > 0) {
          setIntl({ offers, unsupported: false, loading: false });
          /* KEEP THE CUSTOMER'S CHOICE IF IT IS STILL ON OFFER. Adding a
             product re-quotes, and silently moving someone from the carrier
             they picked to the newly-cheapest one is the sort of thing that is
             noticed at the card screen. Only fall back to the cheapest when
             their pick is genuinely no longer available. */
          setCarrier((current) =>
            current && offers.some((o) => o.carrier === current) ? current : offers[0].carrier
          );
        } else {
          setIntl({ offers: [], unsupported: true, loading: false });
          setCarrier(null);
        }
      } catch {
        // Treated as unquotable — the order still goes through, by email.
        if (live) {
          setIntl({ offers: [], unsupported: true, loading: false });
          setCarrier(null);
        }
      }
    })();

    return () => {
      live = false;
    };
    // form.city is deliberately absent: it does not affect a cross-border rate,
    // and re-quoting on every keystroke would be a request per character.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, countryCode, lines]);

  /* When checkout opened, so the order endpoint can tell a person from a
     script (see lib/anti-spam: a form filled faster than MIN_FILL_MS is a
     bot). Stamped in an effect rather than in the initialiser — Date.now() is
     impure, and a render may be discarded or replayed, so a timestamp taken
     during one is not necessarily the moment the page appeared. The effect
     runs at commit, which is that moment, and long before anyone can submit.

     Zero until then. The server treats a non-positive ts as "not measured" and
     skips the check rather than failing it, so the brief window costs nothing
     even if a request could somehow beat the effect. */
  const mountedAt = useRef(0);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  /* Prefill from the signed-in account, once per identity.
     
     Same render-phase adjustment as the voucher above, and for a better reason
     than lint: the account arrives asynchronously, so an effect would render
     the empty fields first and fill them a frame later — a visible flicker on
     every checkout by a signed-in customer. Filling before the first paint
     means the fields are simply already there.

     Guarded on the id and the profile FIELDS, not on the objects. Auth hands
     back a new user object on every token refresh, so keying on identity would
     re-run constantly; but the profile arrives AFTER the user, so keying on
     the id alone would run once against an absent profile and never fill the
     name — which the old effect got right by depending on both. Keying on the
     values themselves gets both: refreshes are ignored, a profile arriving
     late is not.

     Re-running is harmless in any case. Each field falls back to itself first,
     so this can only ever fill a blank and never overwrite something typed. */
  const prefillKey = user
    ? `${user.id}|${profile?.first_name ?? ""}|${profile?.surname ?? ""}`
    : null;
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  if (user && prefilledFor !== prefillKey) {
    setPrefilledFor(prefillKey);
    setForm((f) => ({
      ...f,
      email: f.email || user.email || "",
      firstName: f.firstName || profile?.first_name || "",
      surname: f.surname || profile?.surname || "",
    }));
  }

  // Nothing to check out. Waits for `hydrated` — before the saved cart is read
  // back, `lines` is [] for reasons that have nothing to do with the shopper.
  useEffect(() => {
    if (hydrated && lines.length === 0) router.replace(`/${locale}/cart`);
  }, [hydrated, lines.length, locale, router]);

  const L = {
    identification: uk ? "Ідентифікація" : "Identification",
    identLead: uk
      ? "Оформіть замовлення як гість або створіть акаунт — це займе хвилину."
      : "Check out as a guest, or create an account in under a minute.",
    signedInAs: uk ? "Ви увійшли як" : "You're signed in as",
    notYou: uk ? "Це не ви?" : "Not you?",
    email: uk ? "Електронна пошта" : "Email address",
    emailHint: uk ? "Ми надішлемо підтвердження замовлення на цю адресу." : "We'll send your order confirmation here.",
    guest: uk ? "Оформити як гість" : "Continue as guest",
    guestNote: uk ? "Без реєстрації. Ви зможете створити акаунт пізніше." : "No account needed. You can always create one later.",
    account: uk ? "Створити акаунт" : "Create an account",
    accountNote: uk
      ? "Відстежуйте замовлення, збирайте бонуси та оформлюйте швидше наступного разу."
      : "Track orders, collect loyalty rewards and check out faster next time.",
    haveAcc: uk ? "Вже маєте акаунт?" : "Already have an account?",
    signIn: uk ? "Увійти" : "Sign in",
    continue: uk ? "Продовжити" : "Continue",
    delivery: uk ? "Доставка" : "Delivery",
    contact: uk ? "Контактні дані" : "Contact details",
    address: uk ? "Адреса доставки" : "Shipping address",
    method: uk ? "Спосіб доставки" : "Delivery method",
    otherStorefront: uk
      ? "Відкрити англійську версію"
      : locale === "ja"
        ? "ウクライナ語版サイトへ"
        : "Go to the Ukrainian site",
    destUkraine: uk ? "Україна — Нова Пошта" : "Ukraine — Nova Poshta",
    destUkraineNote: uk
      ? "Доставка у відділення. Вартість розраховується одразу."
      : "Delivery to a branch. Cost calculated instantly.",
    destIntl: uk ? "Міжнародна доставка" : "International delivery",
    destIntlNote: uk
      ? "Доставка за адресою за межі України."
      : "Address delivery outside Ukraine.",
    // The one-total model: nothing is charged now; the exact order total —
    // goods delivered to the destination — is confirmed by email, then paid in
    // ONE payment. Never reintroduce "invoice delivery separately" here.
    intlNotice: uk
      ? "Зараз оплата не знімається. Ми підтвердимо точну суму замовлення — товар разом із доставкою до вашого напрямку — електронною поштою, і ви сплатите її одним платежем."
      : "Nothing is charged yet. We'll confirm your exact order total — goods including delivery to your destination — by email, and you'll pay it in a single payment.",
    /* Shown once Nova Post HAS priced the destination: this order is paid for
       now, like a domestic one, and the total already contains the delivery. */
    intlPriced: uk
      ? "Доставку до вашої країни розраховано та вже включено до суми замовлення. Ви сплачуєте одну суму — товар із доставкою."
      : "Delivery to your country has been calculated and is already included in your order total. You pay one amount — goods including delivery.",
    calculating: uk ? "Розрахунок…" : "Calculating…",
    /* The carrier choice. Only shown when there is genuinely a choice — one
       offer renders as a plain line, because a radio group of one is a
       decision nobody was asked to make. */
    carrierHeading: uk ? "Спосіб доставки" : "Delivery service",
    carrierCheapest: uk ? "Найдешевше" : "Cheapest",
    carrierIncluded: uk ? "Включено до суми замовлення" : "Included in your order total",
    needCity: uk ? "Оберіть місто доставки." : "Please choose a delivery city.",
    needBranch: uk ? "Оберіть відділення Нової Пошти." : "Please choose a Nova Poshta branch.",
    needAddress: uk ? "Вкажіть вулицю та будинок для кур'єрської доставки." : "Please enter the street and building for courier delivery.",
    methodName: "Nova Poshta / Ukrposhta",
    methodNote: uk ? "Вартість розраховується згодом" : "Calculated later",
    methodHint: uk
      ? "Ми зв'яжемося з вами, щоб узгодити відділення та вартість доставки."
      : "We'll contact you to confirm the branch and delivery cost.",
    firstName: uk ? "Ім'я" : "First name",
    surname: uk ? "Прізвище" : "Surname",
    phone: uk ? "Телефон" : "Telephone",
    street: uk ? "Адреса" : "Address",
    apartment: uk ? "Квартира, під'їзд (необов'язково)" : "Apartment, suite (optional)",
    city: uk ? "Місто" : "City",
    postcode: uk ? "Поштовий індекс" : "Postcode",
    country: uk ? "Країна" : "Country",
    countrySelect: uk ? "Оберіть країну" : "Select a country",
    countryOther: uk ? "Інша (вказати)" : "Other (type it)",
    countryOtherLabel: uk ? "Назва країни" : "Country name",
    needCountry: uk ? "Оберіть країну доставки." : "Please choose a delivery country.",
    countryBlocked: uk ? "На жаль, ми не доставляємо в цю країну." : "We're unable to ship to that destination.",
    toPayment: uk ? "Продовжити до оплати" : "Continue to payment",
    payment: uk ? "Оплата" : "Payment",
    payMethod: uk ? "Спосіб оплати" : "Payment method",
    card: uk ? "Картка / Plata by Mono" : "Card / Plata by Mono",
    cardNote: uk
      ? "Оплата карткою через захищену сторінку Monobank."
      : "Pay by card through Monobank's secure page.",
    place: uk ? "Перейти до оплати" : "Continue to payment",
    placeRequest: uk ? "Оформити замовлення" : "Place order",
    notLive: uk
      ? "Ви перейдете на захищену сторінку Monobank, щоб завершити оплату карткою."
      : "You'll be taken to Monobank's secure page to complete your card payment.",
    payFailed: uk
      ? "Не вдалося створити платіж. Спробуйте ще раз або напишіть на admin@tactical-hb.com."
      : "We couldn't start the payment. Please try again, or email admin@tactical-hb.com.",
    payUnavailable: uk
      ? "Оплата карткою тимчасово недоступна. Спробуйте пізніше."
      : "Card payment is temporarily unavailable. Please try again shortly.",
    backDelivery: uk ? "Назад до доставки" : "Back to delivery",
    required: uk ? "Заповніть усі обов'язкові поля." : "Please fill in all required fields.",
    badEmail: uk ? "Введіть дійсну електронну пошту." : "Enter a valid email address.",
    badPhone: uk ? "Введіть номер телефону." : "Enter your telephone number.",
    secure: uk ? "Ваші дані передаються захищено." : "Your details are transmitted securely.",
  };

  const set = (k: keyof DeliveryDetails) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submitIdentification = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError(L.badEmail);
    // Signed-in shoppers never see the account option, so this only fires for
    // a genuine new sign-up.
    if (identity === "account" && !user && !accountCreated) {
      setShowAccount(true);
      return;
    }
    setStep("delivery");
  };

  const submitDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Country first for international — the address fields are hidden until it's
    // chosen, so a generic "fill required fields" here would point at inputs the
    // customer can't see. countryCode is only set by picking from the list or
    // choosing "Other".
    if (destination === "international" && !countryCode) return setError(L.needCountry);

    // A typed "Other" country bypasses the dropdown exclusions — block the one
    // destination we can't ship to at all.
    if (destination === "international" && countryCode === OTHER && isBlockedManualCountry(form.country)) {
      return setError(L.countryBlocked);
    }

    // Branch delivery needs a branch, not a street address; international needs
    // the full address. Requiring both would block every customer.
    const need: (keyof DeliveryDetails)[] =
      destination === "ukraine"
        ? ["firstName", "surname", "phone"]
        : ["firstName", "surname", "phone", "address", "city", "postcode", "country"];
    if (need.some((k) => !form[k].trim())) return setError(L.required);

    if (destination === "ukraine") {
      if (!np?.cityRef) return setError(L.needCity);
      if (np.deliveryType === "courier") {
        if (!np.street.trim() || !np.building.trim()) return setError(L.needAddress);
      } else if (!np.warehouseRef) {
        return setError(L.needBranch);
      }
    }
    // A bare "+" or "+380" is the seeded prefix, not a number.
    if (form.phone.replace(/[^\d]/g, "").length < 9) return setError(L.badPhone);
    setStep("payment");
  };

  /**
   * Hand off to Monobank.
   *
   * We send only what is in the basket — the server prices it and decides what
   * to charge. The cart is deliberately NOT cleared here: nothing has been paid
   * until Monobank says so, and a customer who abandons the payment page must
   * come back to a basket that still holds their things.
   */
  const payWithMonobank = async () => {
    setPlacing(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          ts: mountedAt.current,
          delivery: form,
          voucherCode: voucher?.code ?? null,
          // Only the destination is sent — never the cost. The server re-quotes,
          // so a shipping price from the browser would be trivially set to zero.
          shipping:
            destination === "ukraine" && np?.cityRef
              ? np.deliveryType === "courier"
                ? {
                    method: "nova_poshta",
                    deliveryType: "courier",
                    cityRef: np.cityRef,
                    cityName: np.cityName,
                    street: np.street,
                    building: np.building,
                    apartment: np.apartment,
                    notes: np.notes,
                  }
                : {
                    method: "nova_poshta",
                    deliveryType: "warehouse",
                    cityRef: np.cityRef,
                    cityName: np.cityName,
                    warehouseRef: np.warehouseRef,
                    warehouseName: np.warehouseName,
                  }
              : {
                  method: "international",
                  // The country is what a cross-border parcel is priced by; the
                  // city is sent for completeness and does not affect the rate.
                  // Still only a destination — never a cost.
                  countryCode: countryCode === OTHER ? "" : countryCode,
                  city: form.city,
                  /* WHICH CARRIER, NOT WHAT IT COSTS. A preference is safe to
                     accept from a browser; a price is not. The server re-asks
                     this carrier what it charges, and falls back to the other
                     if it cannot answer at pay time. */
                  carrier: selectedOffer?.carrier ?? null,
                },
          lines: lines.map((l) => ({ slug: l.slug, qty: l.qty, options: l.options })),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        pageUrl?: string;
        requested?: boolean;
        reference?: string;
        error?: string;
      };

      if (!res.ok || !data.ok || (!data.pageUrl && !data.requested)) {
        setPlacing(false);
        /* A storefront mismatch gets its own words. It is the one failure here
           the customer can actually do something about, and "payment failed"
           would send them to look for a problem with their card. */
        setError(
          data.error === LOCALE_SHIPPING_MISMATCH
            ? wrongStorefrontMessage(locale)
            : data.error === "not_configured"
              ? L.payUnavailable
              : L.payFailed
        );
        console.error("[pay] invoice creation failed:", res.status, data.error);
        return;
      }

      // International: no charge yet. The order is recorded and the exact
      // total — goods delivered to the destination — is confirmed by email
      // before any payment, so there is one payment and one total. Snapshot
      // the order for the confirmation page, then clear the basket: the order
      // exists server-side now, and keeping the lines would invite a second
      // submission of the same request.
      if (data.requested) {
        // Freeze names, images and unit prices into the snapshot the same way
        // the server does — the confirmation page must not restate the order
        // from whatever the catalogue says on a later refresh.
        const priced = priceCart(
          lines.map((l) => ({ slug: l.slug, qty: l.qty, options: l.options })),
          locale
        );
        const orderLines: OrderLine[] = priced.lines.map((pl) => {
          const d = describeLine(
            {
              slug: pl.slug,
              qty: pl.qty,
              // Validated options, reshaped: describeLine takes the cart's
              // optional form, priceCart returns the nullable one.
              options: {
                variant: pl.options.variant ?? undefined,
                lid: pl.options.lid,
                rubber: pl.options.rubber,
              },
            },
            locale
          );
          return {
            slug: pl.slug,
            qty: pl.qty,
            name: d?.name ?? pl.name,
            image: d?.image ?? "",
            colour: d?.colour ?? null,
            material: d?.material ?? null,
            addons: d?.addons ?? null,
            unitPrice: pl.unit,
          };
        });
        saveOrder({
          orderNo: data.reference ?? "TCT-ORDER",
          createdAt: new Date().toISOString(),
          locale,
          delivery: form,
          lines: orderLines,
          subtotal,
          discount: discount.eur > 0 ? discount : undefined,
          total: goods,
          voucherCode: voucher?.code ?? null,
          paymentMethod: "card_on_confirmation",
          accountCreated,
        });
        clearCart();
        router.push(`/${locale}/checkout/confirmation`);
        return;
      }

      // Off to Monobank's hosted page. The webhook fulfils the order.
      window.location.href = data.pageUrl as string;
    } catch (err) {
      setPlacing(false);
      setError(L.payFailed);
      console.error("[pay] invoice request failed:", err);
    }
  };

  // Render nothing while the cart is still loading, and while the redirect
  // above is in flight — a flash of the form would be worse than a blank beat.
  if (!hydrated || lines.length === 0) return null;

  /* ---- Account creation interstitial (sits inside step 1) ---- */
  if (showAccount) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
        <CheckoutHeader locale={locale} current="identification" />
        <div className="page-container py-14">
          <AccountCreatingScreen
            locale={locale}
            email={form.email}
            firstName={form.firstName}
            surname={form.surname}
            onDone={() => { setAccountCreated(true); setShowAccount(false); setStep("delivery"); }}
            onSkip={() => { setIdentity("guest"); setShowAccount(false); setStep("delivery"); }}
          />
        </div>
      </div>
    );
  }

  const field = "field";
  const labelCls = "block text-[11px] tracking-[0.2em] uppercase mb-2";
  const labelSt = { color: "var(--text-faint)" };

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <CheckoutHeader
        locale={locale}
        current={step}
        onStepBack={(s) => setStep(s)}
      />

      <div className="page-container py-12 grid lg:grid-cols-[1fr_380px] gap-12 xl:gap-16 items-start">
        <div className="max-w-[620px] w-full">
          {error && (
            <div role="alert" className="mb-6 text-sm px-4 py-3" style={{ background: "#fdecec", color: "#b42318" }}>
              {error}
            </div>
          )}

          {/* ---------- Step 1: Identification ---------- */}
          {step === "identification" && (
            <form onSubmit={submitIdentification}>
              <h1 className="font-display text-3xl md:text-4xl mb-3" style={{ color: "var(--text)" }}>{L.identification}</h1>
              <p className="text-[14px] mb-8" style={{ color: "var(--text-muted)" }}>{L.identLead}</p>

              {user ? (
                <div className="p-5 mb-8" style={{ border: "1px solid var(--border-strong)", background: "var(--bg-soft)" }}>
                  <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>{L.signedInAs}</p>
                  <p className="text-[15px] mt-1" style={{ color: "var(--text)" }}>{user.email}</p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <label className={labelCls} style={labelSt}>{L.email}</label>
                    <input
                      className={field}
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={set("email")}
                      required
                      autoFocus
                    />
                    <p className="text-[12px] mt-2" style={{ color: "var(--text-faint)" }}>{L.emailHint}</p>
                  </div>

                  <div className="flex flex-col gap-3 mb-6" role="radiogroup" aria-label={L.identification}>
                    <IdentityOption
                      id="guest"
                      title={L.guest}
                      note={L.guestNote}
                      active={identity === "guest"}
                      onSelect={setIdentity}
                    />
                    <IdentityOption
                      id="account"
                      title={L.account}
                      note={L.accountNote}
                      active={identity === "account"}
                      onSelect={setIdentity}
                    />
                  </div>

                  <p className="text-[13px] mb-8" style={{ color: "var(--text-muted)" }}>
                    {L.haveAcc}{" "}
                    <Link
                      href={`/${locale}/login?redirect=/${locale}/checkout`}
                      className="underline underline-offset-4"
                      style={{ color: "var(--text)" }}
                    >
                      {L.signIn}
                    </Link>
                  </p>
                </>
              )}

              <button
                type="submit"
                className="w-full sm:w-auto sm:min-w-[280px] h-12 px-8 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85"
                style={{ background: "var(--accent)", color: "#111114" }}
              >
                {L.continue}
              </button>
            </form>
          )}

          {/* ---------- Step 2: Delivery ---------- */}
          {step === "delivery" && (
            <form onSubmit={submitDelivery}>
              <h1 className="font-display text-3xl md:text-4xl mb-8" style={{ color: "var(--text)" }}>{L.delivery}</h1>

              <h2 className="text-[15px] font-medium mb-4" style={{ color: "var(--text)" }}>{L.contact}</h2>
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                <div>
                  <label className={labelCls} style={labelSt}>{L.firstName}</label>
                  <input className={field} autoComplete="given-name" value={form.firstName} onChange={set("firstName")} required />
                </div>
                <div>
                  <label className={labelCls} style={labelSt}>{L.surname}</label>
                  <input className={field} autoComplete="family-name" value={form.surname} onChange={set("surname")} required />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls} style={labelSt}>{L.phone}</label>
                  <input
                    className={field}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={uk ? "+380 00 000 0000" : "+00 000 000 000"}
                    value={form.phone}
                    onChange={set("phone")}
                    required
                  />
                </div>
              </div>

              {/* WHERE THIS STOREFRONT DELIVERS — stated, not asked.

                  This was a two-option radio group. It is a sentence now,
                  because the locale already answered the question and a
                  control with one valid answer only invites the customer to
                  discover that the other one is refused. The line names the
                  other storefront so somebody in the wrong shop has somewhere
                  to go rather than a dead end. */}
              <h2 className="text-[15px] font-medium mb-3" style={{ color: "var(--text)" }}>{L.method}</h2>
              <div
                className="mb-8 p-5"
                style={{ border: "1px solid var(--border-strong)", background: "var(--field-bg)" }}
              >
                <p className="text-[15px]" style={{ color: "var(--text)" }}>
                  {destination === "ukraine" ? L.destUkraine : L.destIntl}
                </p>
                <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
                  {destination === "ukraine" ? L.destUkraineNote : L.destIntlNote}
                </p>
                <p className="text-[13px] mt-3" style={{ color: "var(--text-muted)" }}>
                  {wrongStorefrontMessage(locale)}
                </p>
                {/* On its own line and 44px tall. Inline in the sentence above
                    it was a 16px tap target, which is the line height and not
                    a target at all — the same mistake the mobile pass caught
                    on the bag and the sort control. */}
                <Link
                  href={otherStorefrontPath(locale)}
                  className="inline-flex items-center h-11 text-[13px] underline underline-offset-4 transition-opacity hover:opacity-70"
                  style={{ color: "var(--text)" }}
                >
                  {L.otherStorefront}
                </Link>
              </div>

              {destination === "ukraine" ? (
                <div className="mb-8">
                  <NovaPoshtaPicker locale={locale} cart={lines} value={np} onChange={setNp} />
                </div>
              ) : (
                <>
                  <h2 className="text-[15px] font-medium mb-4" style={{ color: "var(--text)" }}>{L.address}</h2>

                  {/* Country first — the rest of the address appears once chosen. */}
                  <div className="mb-4">
                    <label htmlFor="country-select" className={labelCls} style={labelSt}>{L.country}</label>
                    <div className="relative">
                      <select
                        id="country-select"
                        className={`${field} appearance-none pr-10`}
                        value={countryCode}
                        onChange={(e) => {
                          const code = e.target.value;
                          setCountryCode(code);
                          // Resolve the stored name: a real country's localised
                          // name, or blank for "Other" so the customer types it.
                          setForm((f) => ({ ...f, country: code && code !== OTHER ? countryName(code, locale) : "" }));
                        }}
                        required
                      >
                        <option value="" disabled>{L.countrySelect}</option>
                        {countries.map((c) => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                        <option value={OTHER}>{L.countryOther}</option>
                      </select>
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"
                        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} aria-hidden="true">
                        <path d="M4 7l6 6 6-6" />
                      </svg>
                    </div>
                  </div>

                  {countryCode === OTHER && (
                    <div className="mb-4">
                      <label htmlFor="country-other" className={labelCls} style={labelSt}>{L.countryOtherLabel}</label>
                      <input id="country-other" className={field} autoComplete="country-name"
                        value={form.country} onChange={set("country")} autoFocus required />
                    </div>
                  )}

                  {countryCode && (
                    <>
                      <div className="grid sm:grid-cols-2 gap-4 mb-6">
                        <div className="sm:col-span-2">
                          <label className={labelCls} style={labelSt}>{L.street}</label>
                          <input className={field} autoComplete="address-line1" value={form.address} onChange={set("address")} required />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelCls} style={labelSt}>{L.apartment}</label>
                          <input className={field} autoComplete="address-line2" value={form.apartment} onChange={set("apartment")} />
                        </div>
                        <div>
                          <label className={labelCls} style={labelSt}>{L.city}</label>
                          <input className={field} autoComplete="address-level2" value={form.city} onChange={set("city")} required />
                        </div>
                        <div>
                          <label className={labelCls} style={labelSt}>{L.postcode}</label>
                          <input className={field} autoComplete="postal-code" value={form.postcode} onChange={set("postcode")} required />
                        </div>
                      </div>
                      {/* ── CARRIER CHOICE ───────────────────────────────
                          Only when there is more than one, and only once the
                          prices are in. A single offer needs no radio group:
                          the price is already in the summary and asking
                          somebody to confirm the only option is friction
                          dressed as control.

                          The whole row is the label, so the tap target is the
                          card rather than the 20px circle — the same rule the
                          rest of the mobile pass applied. */}
                      {intl.offers.length > 1 && (
                        <fieldset className="mb-6">
                          <legend className={labelCls} style={labelSt}>
                            {L.carrierHeading}
                          </legend>
                          <div className="flex flex-col gap-2.5 mt-2">
                            {intl.offers.map((offer, i) => {
                              const active = selectedOffer?.carrier === offer.carrier;
                              return (
                                <label
                                  key={offer.carrier}
                                  className="flex items-center gap-3 p-4 cursor-pointer transition-colors"
                                  style={{
                                    border: `1px solid ${active ? "var(--text)" : "var(--border-strong)"}`,
                                    background: active ? "var(--bg-soft)" : "transparent",
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name="carrier"
                                    className="w-5 h-5 shrink-0 accent-black"
                                    checked={active}
                                    onChange={() => setCarrier(offer.carrier)}
                                  />
                                  <span className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                                    <span className="text-[15px]" style={{ color: "var(--text)" }}>
                                      {carrierName(offer.carrier, locale)}
                                    </span>
                                    {/* The list arrives cheapest-first, so the
                                        badge is simply the first one — no
                                        second comparison to fall out of step
                                        with the ordering. */}
                                    {i === 0 && (
                                      <span
                                        className="text-[11px] tracking-[0.14em] uppercase px-2 py-0.5"
                                        style={{ background: "var(--accent)", color: "#111114" }}
                                      >
                                        {L.carrierCheapest}
                                      </span>
                                    )}
                                  </span>
                                  <span
                                    className="text-[15px] font-medium shrink-0 tabular-nums"
                                    style={{ color: "var(--text)" }}
                                  >
                                    <Price money={moneyFromUah(offer.costUah)} locale={locale} />
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                          <p className="text-[12px] mt-2.5" style={{ color: "var(--text-muted)" }}>
                            {L.carrierIncluded}
                          </p>
                        </fieldset>
                      )}

                      <p className="text-[13px] leading-relaxed p-4 mb-8" style={{ background: "var(--bg-soft)", color: "var(--text-muted)" }}>
                        {intl.loading ? L.calculating : isIntlRequest ? L.intlNotice : L.intlPriced}
                      </p>
                    </>
                  )}
                </>
              )}
              <button
                type="submit"
                className="w-full sm:w-auto sm:min-w-[280px] h-12 px-8 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85"
                style={{ background: "var(--accent)", color: "#111114" }}
              >
                {L.toPayment}
              </button>
            </form>
          )}

          {/* ---------- Step 3: Payment ---------- */}
          {step === "payment" && (
            <div>
              <h1 className="font-display text-3xl md:text-4xl mb-8" style={{ color: "var(--text)" }}>{L.payment}</h1>

              <h2 className="text-[15px] font-medium mb-4" style={{ color: "var(--text)" }}>{L.payMethod}</h2>
              <div className="p-5 mb-6" style={{ border: "1px solid var(--ink)" }}>
                <span className="flex items-center gap-3 text-[15px]" style={{ color: "var(--text)" }}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{ border: "1px solid var(--ink)" }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: "var(--ink)" }} />
                  </span>
                  {L.card}
                </span>
                <p className="text-[13px] mt-3 ml-7" style={{ color: "var(--text-muted)" }}>{L.cardNote}</p>
              </div>

              {/* Voucher — last thing before paying, so the total it changes is
                  the one directly above the pay button. */}
              <div className="mb-6">
                <VoucherField
                  locale={locale}
                  signedIn={!!user}
                  cart={lines}
                  applied={voucher}
                  onApply={setVoucher}
                  onRemove={() => setVoucher(null)}
                />
              </div>

              {/* A priced international order pays like any other and must not
                  be told it is a request; only an unquotable one gets the
                  hand-off copy. */}
              <p className="text-[13px] leading-relaxed p-4 mb-6 mt-6" style={{ background: "var(--bg-soft)", color: "var(--text-muted)" }}>
                {isIntlRequest ? L.intlNotice : L.notLive}
              </p>

              <button
                onClick={payWithMonobank}
                disabled={placing || intl.loading}
                className="w-full sm:w-auto sm:min-w-[280px] h-12 px-8 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#111114" }}
              >
                {placing ? "…" : intl.loading ? L.calculating : isIntlRequest ? L.placeRequest : L.place}
              </button>
              <div className="mt-5">
                <button
                  onClick={() => setStep("delivery")}
                  className="text-[13px] underline underline-offset-4 transition-opacity hover:opacity-70"
                  style={{ color: "var(--text-muted)" }}
                >
                  {L.backDelivery}
                </button>
              </div>
            </div>
          )}

          <p className="text-[12px] mt-8" style={{ color: "var(--text-faint)" }}>{L.secure}</p>
        </div>

        <OrderSummaryPanel
          locale={locale}
          discount={discount}
          voucherCode={voucher?.code ?? null}
          discountSource={discountSource}
          shippingUah={destination === "ukraine" ? np?.costUah ?? null : selectedOffer?.costUah ?? null}
          shippingPending={isIntlRequest}
        />
      </div>
    </div>
  );
}
