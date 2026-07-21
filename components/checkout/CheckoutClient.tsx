"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart, linePrice } from "@/components/CartContext";
import { useAuth } from "@/components/AuthContext";
import { describeLine } from "@/lib/cart-display";
import { currencyForLocale, formatMoney, scaleMoney } from "@/lib/currency";
import { makeOrderNo, saveOrder, type DeliveryDetails, type OrderLine } from "@/lib/checkout";
import CheckoutHeader, { type Step } from "./CheckoutHeader";
import OrderSummaryPanel from "./OrderSummaryPanel";
import ExpressPayButtons from "./ExpressPayButtons";
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

export default function CheckoutClient({ locale }: { locale: string }) {
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
    address: "", apartment: "", city: "", postcode: "", country: uk ? "Україна" : "Ukraine",
  });

  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  // Clearing the cart on success would otherwise trip the empty-cart guard and
  // bounce the shopper back to /cart instead of the confirmation page.
  const placedRef = useRef(false);
  // When checkout opened, so the order endpoint can tell a person from a script.
  const mountedAt = useRef(Date.now());

  // Prefill from the signed-in account.
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      email: f.email || user.email || "",
      firstName: f.firstName || profile?.first_name || "",
      surname: f.surname || profile?.surname || "",
    }));
  }, [user, profile]);

  // Nothing to check out. Waits for `hydrated` — before the saved cart is read
  // back, `lines` is [] for reasons that have nothing to do with the shopper.
  useEffect(() => {
    if (hydrated && lines.length === 0 && !placedRef.current) router.replace(`/${locale}/cart`);
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
    toPayment: uk ? "Продовжити до оплати" : "Continue to payment",
    payment: uk ? "Оплата" : "Payment",
    payMethod: uk ? "Спосіб оплати" : "Payment method",
    card: uk ? "Картка / Plata by Mono" : "Card / Plata by Mono",
    cardNote: uk
      ? "Оплата карткою через захищену сторінку Monobank."
      : "Pay by card through Monobank's secure page.",
    orExpress: uk ? "або сплатіть швидше" : "or pay faster with",
    place: uk ? "Оформити замовлення" : "Place order",
    notLive: uk
      ? "Онлайн-оплату ще підключаємо. Ви оформлюєте замовлення зараз — ми зв'яжемося з вами, щоб узгодити оплату та доставку. Кошти зараз не списуються."
      : "Online payment is still being connected. You're placing your order now — we'll contact you to arrange payment and delivery. No money is taken at this stage.",
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
    const need: (keyof DeliveryDetails)[] = ["firstName", "surname", "phone", "address", "city", "postcode", "country"];
    if (need.some((k) => !form[k].trim())) return setError(L.required);
    // A bare "+" or "+380" is the seeded prefix, not a number.
    if (form.phone.replace(/[^\d]/g, "").length < 9) return setError(L.badPhone);
    setStep("payment");
  };

  const placeOrder = async () => {
    setPlacing(true);
    // Snapshot BEFORE clearing the cart, and freeze prices as they stand now.
    const orderLines: OrderLine[] = lines.flatMap((l) => {
      const d = describeLine(l, locale);
      if (!d) return [];
      return [{
        slug: l.slug,
        qty: l.qty,
        name: d.name,
        image: d.image,
        colour: d.colour,
        material: d.material,
        addons: d.addons,
        unitPrice: linePrice(l),
      }];
    });

    const orderNo = makeOrderNo();
    const currency = currencyForLocale(locale);

    // Notify sales BEFORE clearing anything. Until orders are written to
    // Supabase this email is the only record of the order, so it is sent while
    // the data still exists rather than from the confirmation page (which would
    // re-send on every refresh).
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNo,
          locale,
          // Spam screening. No honeypot here — there is no form for a bot to
          // fill; reaching this point requires completing two checkout steps.
          ts: mountedAt.current,
          paymentMethod: L.card,
          totalLabel: formatMoney(subtotal, currency),
          delivery: form,
          lines: orderLines.map((l) => ({
            name: l.name,
            qty: l.qty,
            colour: l.colour,
            material: l.material,
            addons: l.addons,
            unitPriceLabel: formatMoney(scaleMoney(l.unitPrice, l.qty), currency),
          })),
        }),
      });
      if (!res.ok) throw new Error(`order endpoint returned ${res.status}`);
    } catch (err) {
      // A failed notification must never block the customer — they have done
      // nothing wrong and the snapshot still reaches the confirmation page.
      // Logged loudly because it means the shop may not learn about this order.
      console.error("[order] notification failed:", err);
    }

    placedRef.current = true;
    saveOrder({
      orderNo,
      createdAt: new Date().toISOString(),
      locale,
      delivery: form,
      lines: orderLines,
      subtotal,
      paymentMethod: L.card,
      accountCreated,
    });
    clearCart();
    router.push(`/${locale}/checkout/confirmation`);
  };

  // Render nothing while the cart is still loading, and while the redirect
  // above is in flight — a flash of the form would be worse than a blank beat.
  if (!hydrated || (lines.length === 0 && !placedRef.current)) return null;

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

  /** A selectable identity card (guest / create account). */
  const IdentityOption = ({ id, title, note }: { id: Identity; title: string; note: string }) => {
    const active = identity === id;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => setIdentity(id)}
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
  };

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
                    <IdentityOption id="guest" title={L.guest} note={L.guestNote} />
                    <IdentityOption id="account" title={L.account} note={L.accountNote} />
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

              <h2 className="text-[15px] font-medium mb-4" style={{ color: "var(--text)" }}>{L.address}</h2>
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
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
                <div className="sm:col-span-2">
                  <label className={labelCls} style={labelSt}>{L.country}</label>
                  <input className={field} autoComplete="country-name" value={form.country} onChange={set("country")} required />
                </div>
              </div>

              <h2 className="text-[15px] font-medium mb-4" style={{ color: "var(--text)" }}>{L.method}</h2>
              <div className="p-5 mb-8" style={{ border: "1px solid var(--ink)" }}>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-3 text-[15px]" style={{ color: "var(--text)" }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{ border: "1px solid var(--ink)" }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: "var(--ink)" }} />
                    </span>
                    {L.methodName}
                  </span>
                  <span className="text-[13px] shrink-0" style={{ color: "var(--text-muted)" }}>{L.methodNote}</span>
                </div>
                <p className="text-[13px] mt-3 ml-7" style={{ color: "var(--text-muted)" }}>{L.methodHint}</p>
              </div>

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

              <div className="flex items-center gap-3 my-6">
                <span className="flex-1 h-px" style={{ background: "var(--border-strong)" }} />
                <span className="text-[11px] tracking-[0.15em] uppercase" style={{ color: "var(--text-faint)" }}>{L.orExpress}</span>
                <span className="flex-1 h-px" style={{ background: "var(--border-strong)" }} />
              </div>
              <ExpressPayButtons locale={locale} className="mb-8 max-w-[320px]" />

              <p className="text-[13px] leading-relaxed p-4 mb-6" style={{ background: "var(--bg-soft)", color: "var(--text-muted)" }}>
                {L.notLive}
              </p>

              <button
                onClick={placeOrder}
                disabled={placing}
                className="w-full sm:w-auto sm:min-w-[280px] h-12 px-8 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#111114" }}
              >
                {placing ? "…" : L.place}
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

        <OrderSummaryPanel locale={locale} />
      </div>
    </div>
  );
}
