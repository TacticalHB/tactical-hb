"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart, linePrice } from "@/components/CartContext";
import { useAuth } from "@/components/AuthContext";
import { describeLine } from "@/lib/cart-display";
import { makeOrderNo, saveOrder, type DeliveryDetails, type OrderLine } from "@/lib/checkout";
import CheckoutHeader, { type Step } from "./CheckoutHeader";
import OrderSummaryPanel from "./OrderSummaryPanel";
import ExpressPayButtons from "./ExpressPayButtons";
import AccountCreatingScreen from "./AccountCreatingScreen";

/* ---------------------------------------------------------------------------
   Multi-step checkout: delivery → (optional account creation) → payment.

   Guest checkout is the default path; an account is offered, never required.

   NO CARD FIELDS. Monobank Plata is a hosted checkout — card details are
   entered on Monobank's page, never ours. Step 2 chooses a method and nothing
   more, which is both the correct integration shape and keeps us entirely out
   of PCI scope.
--------------------------------------------------------------------------- */

const empty: DeliveryDetails = {
  email: "", firstName: "", surname: "", phone: "",
  address: "", apartment: "", city: "", postcode: "", country: "",
};

export default function CheckoutClient({ locale }: { locale: string }) {
  const uk = locale === "uk";
  const router = useRouter();
  const { lines, subtotal, clearCart, hydrated } = useCart();
  const { user, profile } = useAuth();

  const [step, setStep] = useState<Step>("delivery");
  const [showAccount, setShowAccount] = useState(false);
  const [form, setForm] = useState<DeliveryDetails>({ ...empty, country: uk ? "Україна" : "Ukraine" });
  const [createAccount, setCreateAccount] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  // Clearing the cart on success would otherwise trip the empty-cart guard and
  // bounce the shopper back to /cart instead of the confirmation page.
  const placedRef = useRef(false);

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
    delivery: uk ? "Доставка" : "Delivery",
    contact: uk ? "Контактні дані" : "Contact details",
    address: uk ? "Адреса доставки" : "Shipping address",
    method: uk ? "Спосіб доставки" : "Delivery method",
    methodName: "Nova Poshta / Ukrposhta",
    methodNote: uk ? "Вартість розраховується згодом" : "Calculated later",
    methodHint: uk
      ? "Ми зв'яжемося з вами, щоб узгодити відділення та вартість доставки."
      : "We'll contact you to confirm the branch and delivery cost.",
    email: uk ? "Електронна пошта" : "Email address",
    firstName: uk ? "Ім'я" : "First name",
    surname: uk ? "Прізвище" : "Surname",
    phone: uk ? "Телефон" : "Telephone",
    street: uk ? "Адреса" : "Address",
    apartment: uk ? "Квартира, під'їзд (необов'язково)" : "Apartment, suite (optional)",
    city: uk ? "Місто" : "City",
    postcode: uk ? "Поштовий індекс" : "Postcode",
    country: uk ? "Країна" : "Country",
    continue: uk ? "Продовжити до оплати" : "Continue to payment",
    createAcc: uk ? "Створити акаунт Tactical HB" : "Create a Tactical HB account",
    createAccNote: uk
      ? "Відстежуйте замовлення, збирайте бонуси та оформлюйте швидше наступного разу."
      : "Track orders, collect loyalty rewards and check out faster next time.",
    guestNote: uk ? "Оформлення без реєстрації доступне." : "Guest checkout is available.",
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
    back: uk ? "Назад до доставки" : "Back to delivery",
    required: uk ? "Заповніть усі обов'язкові поля." : "Please fill in all required fields.",
    badEmail: uk ? "Введіть дійсну електронну пошту." : "Enter a valid email address.",
    secure: uk ? "Ваші дані передаються захищено." : "Your details are transmitted securely.",
  };

  const set = (k: keyof DeliveryDetails) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submitDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const need: (keyof DeliveryDetails)[] = ["email", "firstName", "surname", "phone", "address", "city", "postcode", "country"];
    if (need.some((k) => !form[k].trim())) return setError(L.required);
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError(L.badEmail);

    if (createAccount && !user && !accountCreated) {
      setShowAccount(true);
      return;
    }
    setStep("payment");
  };

  const placeOrder = () => {
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

    placedRef.current = true;
    saveOrder({
      orderNo: makeOrderNo(),
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

  /* ---- Account interstitial ---- */
  if (showAccount) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
        <CheckoutHeader locale={locale} current="delivery" />
        <div className="page-container py-14">
          <AccountCreatingScreen
            locale={locale}
            email={form.email}
            firstName={form.firstName}
            surname={form.surname}
            onDone={() => { setAccountCreated(true); setShowAccount(false); setStep("payment"); }}
            onSkip={() => { setCreateAccount(false); setShowAccount(false); setStep("payment"); }}
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
        onBack={step === "payment" ? () => setStep("delivery") : undefined}
      />

      <div className="page-container py-12 grid lg:grid-cols-[1fr_380px] gap-12 xl:gap-16 items-start">
        <div className="max-w-[620px] w-full">
          {error && (
            <div role="alert" className="mb-6 text-sm px-4 py-3" style={{ background: "#fdecec", color: "#b42318" }}>
              {error}
            </div>
          )}

          {step === "delivery" ? (
            <form onSubmit={submitDelivery}>
              <h1 className="font-display text-3xl md:text-4xl mb-8" style={{ color: "var(--text)" }}>{L.delivery}</h1>

              <h2 className="text-[15px] font-medium mb-4" style={{ color: "var(--text)" }}>{L.contact}</h2>
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                <div className="sm:col-span-2">
                  <label className={labelCls} style={labelSt}>{L.email}</label>
                  <input className={field} type="email" autoComplete="email" value={form.email} onChange={set("email")} required />
                </div>
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
                  <input className={field} type="tel" inputMode="tel" autoComplete="tel" placeholder="+380 00 000 0000" value={form.phone} onChange={set("phone")} required />
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
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-3 text-[15px]" style={{ color: "var(--text)" }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{ border: "1px solid var(--ink)" }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: "var(--ink)" }} />
                    </span>
                    {L.methodName}
                  </span>
                  <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>{L.methodNote}</span>
                </div>
                <p className="text-[13px] mt-3 ml-7" style={{ color: "var(--text-muted)" }}>{L.methodHint}</p>
              </div>

              {!user && (
                <label className="flex items-start gap-3 mb-8 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 shrink-0"
                    checked={createAccount}
                    onChange={(e) => setCreateAccount(e.target.checked)}
                  />
                  <span>
                    <span className="text-[15px] block" style={{ color: "var(--text)" }}>{L.createAcc}</span>
                    <span className="text-[13px] block mt-0.5" style={{ color: "var(--text-muted)" }}>{L.createAccNote}</span>
                    <span className="text-[12px] block mt-1" style={{ color: "var(--text-faint)" }}>{L.guestNote}</span>
                  </span>
                </label>
              )}

              <button
                type="submit"
                className="w-full sm:w-auto sm:min-w-[280px] h-12 px-8 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85"
                style={{ background: "var(--accent)", color: "#111114" }}
              >
                {L.continue}
              </button>
            </form>
          ) : (
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
                  {L.back}
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
