"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/CartContext";
import { useAuth } from "@/components/AuthContext";
import { money, subtractMoney } from "@/lib/currency";
import VoucherField, { type AppliedVoucher } from "./VoucherField";
import NovaPoshtaPicker, { type NovaPoshtaSelection } from "./NovaPoshtaPicker";
import { countryOptions, countryName, isBlockedManualCountry, OTHER } from "@/lib/countries";
import { type DeliveryDetails } from "@/lib/checkout";
import CheckoutHeader, { type Step } from "./CheckoutHeader";
import OrderSummaryPanel from "./OrderSummaryPanel";
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
type Destination = "ukraine" | "international";

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
    address: "", apartment: "", city: "", postcode: "", country: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [voucher, setVoucher] = useState<AppliedVoucher | null>(null);

  // Ukrainian visitors default to branch delivery; everyone else to an address.
  const [destination, setDestination] = useState<Destination>(uk ? "ukraine" : "international");
  const [np, setNp] = useState<NovaPoshtaSelection | null>(null);
  // The chosen country code, "OTHER", or "" (nothing picked yet). Address
  // fields stay hidden until this is set. form.country holds the resolved name.
  const [countryCode, setCountryCode] = useState("");
  const countries = useMemo(() => countryOptions(locale), [locale]);

  // A voucher is denominated in EUR; money() converts it for the UAH side.
  const discount = voucher ? money(voucher.amountEur) : money(0, 0);
  const goods = subtractMoney(subtotal, discount);

  // Shipping is UAH-only — Nova Poshta quotes in hryvnia and it is charged on
  // top of the goods. International shipping is billed after the order, so it
  // adds nothing here.
  const shippingUah = destination === "ukraine" ? np?.costUah ?? 0 : 0;
  const total = { eur: goods.eur, uah: goods.uah + shippingUah };

  // A voucher applied to one basket must not survive a change to that basket —
  // its minimum-order rule was checked against the old contents.
  useEffect(() => {
    if (voucher) setVoucher(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

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
    destUkraine: uk ? "Україна — Нова Пошта" : "Ukraine — Nova Poshta",
    destUkraineNote: uk
      ? "Доставка у відділення. Вартість розраховується одразу."
      : "Delivery to a branch. Cost calculated instantly.",
    destIntl: uk ? "Міжнародна доставка" : "International delivery",
    destIntlNote: uk
      ? "Доставка за адресою за межі України."
      : "Address delivery outside Ukraine.",
    intlNotice: uk
      ? "Вартість доставки буде розрахована після оформлення замовлення — ми зв'яжемося з вами й виставимо рахунок окремо. Зараз ви сплачуєте лише за товар."
      : "Shipping cost will be calculated after your order is placed — we'll contact you and invoice it separately. You're paying for the goods only at this stage.",
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
              : { method: "international" },
          lines: lines.map((l) => ({ slug: l.slug, qty: l.qty, options: l.options })),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; pageUrl?: string; error?: string };

      if (!res.ok || !data.ok || !data.pageUrl) {
        setPlacing(false);
        setError(data.error === "not_configured" ? L.payUnavailable : L.payFailed);
        console.error("[pay] invoice creation failed:", res.status, data.error);
        return;
      }

      // Off to Monobank's hosted page. The webhook fulfils the order.
      window.location.href = data.pageUrl;
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

              {/* Destination decides which form follows: a Nova Poshta branch
                  within Ukraine, or a full address anywhere else. */}
              <h2 className="text-[15px] font-medium mb-4" style={{ color: "var(--text)" }}>{L.method}</h2>
              <div className="flex flex-col gap-3 mb-8" role="radiogroup" aria-label={L.method}>
                {([
                  { id: "ukraine" as const, title: L.destUkraine, note: L.destUkraineNote },
                  { id: "international" as const, title: L.destIntl, note: L.destIntlNote },
                ]).map((o) => {
                  const active = destination === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => { setDestination(o.id); setError(null); }}
                      className="w-full flex items-start gap-3.5 p-5 text-left transition-colors"
                      style={{
                        border: active ? "1px solid var(--ink)" : "1px solid var(--border-strong)",
                        background: "var(--field-bg)",
                      }}
                    >
                      <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ border: `1px solid ${active ? "var(--ink)" : "var(--border-strong)"}` }}>
                        {active && <span className="w-2 h-2 rounded-full" style={{ background: "var(--ink)" }} />}
                      </span>
                      <span>
                        <span className="block text-[15px]" style={{ color: "var(--text)", fontWeight: active ? 500 : 400 }}>{o.title}</span>
                        <span className="block text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>{o.note}</span>
                      </span>
                    </button>
                  );
                })}
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
                      <p className="text-[13px] leading-relaxed p-4 mb-8" style={{ background: "var(--bg-soft)", color: "var(--text-muted)" }}>
                        {L.intlNotice}
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

              <p className="text-[13px] leading-relaxed p-4 mb-6 mt-6" style={{ background: "var(--bg-soft)", color: "var(--text-muted)" }}>
                {L.notLive}
              </p>

              <button
                onClick={payWithMonobank}
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

        <OrderSummaryPanel
          locale={locale}
          discount={discount}
          voucherCode={voucher?.code ?? null}
          shippingUah={destination === "ukraine" ? np?.costUah ?? null : null}
          shippingPending={destination === "international"}
        />
      </div>
    </div>
  );
}
