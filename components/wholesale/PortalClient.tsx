"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { t } from "@/lib/i18n-text";
import { currencyForLocale, formatMoney, money, type Money } from "@/lib/currency";
import { submitWholesaleRequest } from "@/app/actions/wholesale";
import { NO_ADDONS, type LineAddons } from "@/lib/wholesale-display";
import type { AddonKey } from "@/lib/wholesale-portal";
import type { PortalPartner } from "@/lib/wholesale-display";
import { HMD_OPTIONS, WINDCOVER_OPTIONS, type OptionSpec } from "@/components/HmdMaterialSelector";

/* ---------------------------------------------------------------------------
   The request builder.

   WHAT IS DELIBERATELY ABSENT: there is no delivery step, no carrier picker,
   no shipping figure, no pay button and no route to Monobank. A partner sets
   quantities and sends the list; terms and payment are agreed by a person, by
   email. Anything that looked like a checkout here would be a promise the
   system cannot keep — the price of a trade order is negotiated, and nobody
   has agreed it at the moment this form is submitted.

   PRICES ARRIVE AS PROPS, RESOLVED SERVER-SIDE. A null means no dealer price
   exists for that product yet, and the line reads "quote on request". The
   retail price is not in this component at all, so there is nothing here to
   fall back to it by accident.

   THE TOTAL IS A COURTESY, NOT AN INVOICE. It appears only when every line in
   the request has a dealer price — a partial sum would read as the cost of the
   order, and it would be the cost of the priced half.
--------------------------------------------------------------------------- */

/* One orderable thing: a product without colours, or one colour of one that
   has them. `key` is the stock sku, which makes it both a stable React key and
   the thing staff will pick against. */
export type PortalLine = {
  key: string;
  variant: string | null;
  swatch: string | null;
  /** The colour's name, or the product's when there are no colours. */
  label: string;
  priceEur: number | null;
  priceUah: number | null;
};

export type PortalProduct = {
  slug: string;
  name: string;
  category: string;
  image: string;
  lines: PortalLine[];
  /** Which add-ons this product takes — decided by category, as retail does. */
  addons: AddonKey[];
  /* What each add-on costs in this partner's book, so a configuration can be
     priced live. Null throughout when the partner has no book. Advisory only:
     the server recomputes every figure from the database on submit. */
  addonPrices: Partial<Record<AddonKey, Money | null>>;
};

type Qty = Record<string, number>;
type Opts = Record<string, LineAddons>;

/** A chosen line, flattened out of the grouped catalogue for the summary. */
type Chosen = {
  product: PortalProduct;
  line: PortalLine;
  qty: number;
  addons: LineAddons;
  /** Effective unit for THIS configuration, or null when unpriced. */
  unit: Money | null;
};

/* The option labels come from the retail selector's own specs, in all four
   languages. Retyping "With FEAR 9E418" here would be a second copy of a
   product name that has already been renamed once (0029). */
const ADDON_SPEC: Record<AddonKey, OptionSpec> = {
  lid: HMD_OPTIONS.find((o) => o.key === "lid")!,
  rubber: HMD_OPTIONS.find((o) => o.key === "rubber")!,
  timer: WINDCOVER_OPTIONS.find((o) => o.key === "timer")!,
};

const CATEGORY_ORDER = ["bowl", "hmd", "windcover", "accessory"] as const;

/* ---------------------------------------------------------------------------
   Both of these live at module scope, NOT inside PortalClient.

   They were defined in the render body, which makes them a NEW component type
   on every render — so React unmounted and remounted them on each keystroke
   and each toggle. The quantity boxes survived that because a controlled input
   is rebuilt from its prop, but the chips did not behave: a click landed on a
   node that the next render had already replaced, and the second option on a
   row simply would not stick.
--------------------------------------------------------------------------- */

/**
 * What one unit of a configured line costs, or null when it has no price.
 *
 * The same arithmetic the server does in lib/wholesale-prices — base plus each
 * ticked surcharge. Duplicated here on purpose: a live total that waits for a
 * round trip is a total nobody watches change. Nothing computed here is ever
 * sent or stored.
 */
function effectiveUnit(product: PortalProduct, line: PortalLine, chosen: LineAddons): Money | null {
  if (line.priceEur === null || line.priceUah === null) return null;
  let eur = line.priceEur;
  let uah = line.priceUah;
  for (const key of product.addons) {
    if (!chosen[key]) continue;
    const a = product.addonPrices[key];
    if (!a) return null;
    eur += a.eur;
    uah += a.uah;
  }
  return { eur: Math.round(eur * 100) / 100, uah: Math.round(uah) };
}

/* The add-on chips.

   Checkboxes in everything but name: aria-pressed, 44px tall, and the label
   spelled out rather than reduced to the PDP's glyphs — a dense list has no
   room for a legend, and "With FEAR 9E418" has to be readable at a glance when
   it is the difference between two otherwise identical lines.

   One configuration per row, deliberately. A partner wanting forty with a lid
   and ten without says so in the note, the same way a colour split used to go
   there before colours became rows. Expanding every combination would be four
   rows per HMD before colours are even counted. */
function AddonChips({
  addons,
  chosen,
  locale,
  onToggle,
}: {
  addons: AddonKey[];
  chosen: LineAddons;
  locale: string;
  onToggle: (addon: AddonKey) => void;
}) {
  if (addons.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {addons.map((key) => {
        const on = chosen[key];
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(key)}
            className="inline-flex items-center h-11 px-3 rounded-full text-[12.5px] transition-colors"
            style={{
              background: on ? "var(--text)" : "transparent",
              color: on ? "#ffffff" : "var(--text-muted)",
              border: `1px solid ${on ? "var(--text)" : "var(--border-strong)"}`,
            }}
          >
            {t(locale, ADDON_SPEC[key])}
          </button>
        );
      })}
    </div>
  );
}

/* The quantity box, shared by plain products and colour rows so the two can
   never drift apart in size or behaviour. */
function QtyBox({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (raw: string) => void;
}) {
  return (
    <div className="shrink-0">
      <label className="sr-only" htmlFor={`qty-${id}`}>
        {label}
      </label>
      <input
        id={`qty-${id}`}
        className="w-[84px] h-11 text-center text-[15px] tabular-nums rounded-[4px]"
        style={{
          border: `1px solid ${value > 0 ? "var(--text)" : "var(--border-strong)"}`,
          background: "#ffffff",
          color: "var(--text)",
        }}
        dir="ltr"
        inputMode="numeric"
        type="text"
        value={value === 0 ? "" : String(value)}
        placeholder="0"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default function PortalClient({
  locale,
  partner,
  products,
}: {
  locale: string;
  partner: PortalPartner;
  products: PortalProduct[];
}) {
  const [qty, setQty] = useState<Qty>({});
  const [opts, setOpts] = useState<Opts>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const currency = currencyForLocale(locale);
  /* One product carries the answer for all of them: the book is a property of
     the partner, so if any line is priced they all are. */
  const hasBook = partner.partnerType !== null;

  const L = {
    title: t(locale, { en: "Wholesale ordering", uk: "Оптове замовлення", ja: "卸売のご注文", ar: "الطلب بالجملة" }),
    intro: t(locale, {
      en: "Set the quantities you need and send the list. We'll confirm availability and email you the payment details — nothing is charged here.",
      uk: "Вкажіть потрібні кількості та надішліть список. Ми підтвердимо наявність і надішлемо реквізити для оплати — тут нічого не списується.",
      ja: "必要な数量を入力してリストをお送りください。在庫を確認のうえ、お支払い方法をメールでご案内します。この画面でのご請求はありません。",
      ar: "حدّد الكميات التي تحتاجها وأرسل القائمة. سنؤكّد التوفّر ونرسل تفاصيل الدفع عبر البريد الإلكتروني — ولا يُخصم شيء هنا.",
    }),
    /* "—" rather than "quote on request": a priced book is the normal state
       now, so a blank line means something is missing at our end, and saying
       "we'll quote it" would promise a follow-up nobody has queued. */
    noPrice: "—",
    noBookTitle: t(locale, {
      en: "Your prices aren't set yet",
      uk: "Ваші ціни ще не встановлено",
      ja: "価格の設定がまだ完了していません",
      ar: "لم تُحدَّد أسعارك بعد",
    }),
    noBookBody: t(locale, {
      en: "Your account is open, but we haven't finished setting your trade prices. We'll email you as soon as they're ready — usually the same working day.",
      uk: "Ваш акаунт відкрито, але ми ще не завершили налаштування оптових цін. Напишемо, щойно все буде готово — зазвичай того ж робочого дня.",
      ja: "アカウントは開設済みですが、卸価格の設定がまだ完了していません。準備ができ次第メールでご連絡します（通常は同じ営業日中です）。",
      ar: "حسابك مفتوح، لكننا لم ننتهِ بعد من ضبط أسعارك التجارية. سنراسلك بمجرد جاهزيتها — عادةً في يوم العمل نفسه.",
    }),
    unpricedLine: t(locale, {
      en: "One of the products you've chosen has no price yet. Remove it, or email us and we'll sort it out.",
      uk: "Для одного з обраних товарів ще немає ціни. Приберіть його або напишіть нам.",
      ja: "選択された製品のうち 1 点にまだ価格が設定されていません。その行を削除いただくか、メールでご連絡ください。",
      ar: "أحد المنتجات التي اخترتها لا يحمل سعرًا بعد. أزِله أو راسلنا وسنعالج الأمر.",
    }),
    qtyLabel: t(locale, { en: "Quantity", uk: "Кількість", ja: "数量", ar: "الكمية" }),
    note: t(locale, {
      en: "Notes — PO number, delivery preference, anything we should know (optional)",
      uk: "Примітки — номер замовлення, побажання щодо доставки, будь-що важливе (необов'язково)",
      ja: "備考 — 発注番号、配送のご希望など（任意）",
      ar: "ملاحظات — رقم أمر الشراء أو تفضيلات التوصيل أو أي شيء ينبغي أن نعرفه (اختياري)",
    }),
    summary: t(locale, { en: "Your request", uk: "Ваш запит", ja: "リクエスト内容", ar: "طلبك" }),
    units: t(locale, { en: "units", uk: "одиниць", ja: "点", ar: "وحدة" }),
    lines: t(locale, { en: "lines", uk: "позицій", ja: "品目", ar: "بند" }),
    estimate: t(locale, { en: "Total", uk: "Разом", ja: "合計", ar: "الإجمالي" }),
    exShipping: t(locale, {
      en: "Excludes shipping. Nothing is charged here.",
      uk: "Без вартості доставки. Тут нічого не списується.",
      ja: "送料は含みません。この画面でのご請求はありません。",
      ar: "لا يشمل الشحن. ولا يُخصم شيء هنا.",
    }),
    willQuote: t(locale, {
      en: "We'll quote this request by email.",
      uk: "Ми надішлемо прорахунок листом.",
      ja: "お見積りをメールでお送りします。",
      ar: "سنرسل لك عرض سعر عبر البريد الإلكتروني.",
    }),
    submit: t(locale, { en: "Send order request", uk: "Надіслати запит", ja: "リクエストを送信", ar: "إرسال طلب الشراء" }),
    empty: t(locale, {
      en: "Set a quantity on at least one product.",
      uk: "Вкажіть кількість хоча б для одного товару.",
      ja: "少なくとも 1 つの製品に数量をご入力ください。",
      ar: "حدّد كمية لمنتج واحد على الأقل.",
    }),
    perColour: t(locale, {
      en: "Priced and ordered per colour",
      uk: "Ціна та замовлення — по кольорах",
      ja: "価格・ご注文はカラーごと",
      ar: "السعر والطلب لكل لون",
    }),
    clear: t(locale, { en: "Clear all", uk: "Очистити", ja: "すべてクリア", ar: "مسح الكل" }),
    doneTitle: t(locale, { en: "Request sent", uk: "Запит надіслано", ja: "リクエストを送信しました", ar: "أُرسل الطلب" }),
    doneBody: t(locale, {
      en: "We'll confirm availability and email you the payment details. Nothing has been charged.",
      uk: "Ми підтвердимо наявність і надішлемо реквізити для оплати. Наразі нічого не списано.",
      ja: "在庫を確認のうえ、お支払い方法をメールでお送りします。ご請求はまだ発生していません。",
      ar: "سنؤكّد التوفّر ونرسل إليك تفاصيل الدفع عبر البريد الإلكتروني. ولم يُخصم أي مبلغ.",
    }),
    ref: t(locale, { en: "Reference", uk: "Номер запиту", ja: "リクエスト番号", ar: "رقم الطلب" }),
    another: t(locale, { en: "Start another request", uk: "Створити ще один запит", ja: "別のリクエストを作成", ar: "ابدأ طلبًا آخر" }),
    failed: t(locale, {
      en: "We couldn't send your request. Please try again.",
      uk: "Не вдалося надіслати запит. Спробуйте ще раз.",
      ja: "リクエストを送信できませんでした。もう一度お試しください。",
      ar: "تعذّر إرسال طلبك. يرجى المحاولة مرة أخرى.",
    }),
    rateLimited: t(locale, {
      en: "That's a lot of requests in one hour. Please email us instead and we'll help directly.",
      uk: "Забагато запитів за годину. Напишіть нам — ми допоможемо напряму.",
      ja: "1 時間内のリクエストが多すぎます。メールでご連絡ください、直接対応します。",
      ar: "هذا عدد كبير من الطلبات خلال ساعة واحدة. راسلنا وسنساعدك مباشرة.",
    }),
    notApproved: t(locale, {
      en: "This account can't submit requests. Please get in touch.",
      uk: "Цей акаунт не може надсилати запити. Зв'яжіться з нами.",
      ja: "このアカウントではリクエストを送信できません。ご連絡ください。",
      ar: "لا يمكن لهذا الحساب إرسال طلبات. يرجى التواصل معنا.",
    }),
    categories: {
      bowl: t(locale, { en: "Bowls", uk: "Чаші", ja: "ボウル", ar: "الرؤوس" }),
      hmd: t(locale, { en: "Heat devices", uk: "Пристрої нагріву", ja: "ヒートデバイス", ar: "أجهزة الحرارة" }),
      windcover: t(locale, { en: "Wind covers", uk: "Ковпаки", ja: "ウインドカバー", ar: "أغطية الرياح" }),
      accessory: t(locale, { en: "Accessories", uk: "Аксесуари", ja: "アクセサリー", ar: "الإكسسوارات" }),
    } as Record<string, string>,
  };

  const chosen: Chosen[] = useMemo(() => {
    const out: Chosen[] = [];
    for (const product of products) {
      for (const line of product.lines) {
        const n = qty[line.key] ?? 0;
        if (n > 0) {
          const addons = opts[line.key] ?? NO_ADDONS;
          out.push({ product, line, qty: n, addons, unit: effectiveUnit(product, line, addons) });
        }
      }
    }
    return out;
  }, [products, qty, opts]);

  const units = chosen.reduce((s, c) => s + c.qty, 0);

  /* Only when every chosen line is priced. A partial sum would read as the
     cost of the request when it is the cost of the priced half — and the
     server refuses such a request outright, so the button is disabled too. */
  const unpriced = chosen.some((c) => c.unit === null);
  const total: Money | null = useMemo(() => {
    if (chosen.length === 0 || chosen.some((c) => c.unit === null)) return null;
    return chosen.reduce(
      (acc, c) => ({
        eur: Math.round((acc.eur + (c.unit?.eur ?? 0) * c.qty) * 100) / 100,
        uah: acc.uah + (c.unit?.uah ?? 0) * c.qty,
      }),
      money(0, 0)
    );
  }, [chosen]);

  const toggleAddon = (key: string, addon: AddonKey) =>
    setOpts((o) => {
      const current = o[key] ?? NO_ADDONS;
      return { ...o, [key]: { ...current, [addon]: !current[addon] } };
    });

  const setQuantity = (key: string, raw: string) => {
    // Integers, never negative. An empty box means zero rather than NaN.
    const n = Math.floor(Number(raw.replace(/[^\d]/g, "")));
    setQty((q) => ({ ...q, [key]: Number.isFinite(n) && n > 0 ? Math.min(n, 100000) : 0 }));
  };

  const send = async () => {
    setError(null);
    if (chosen.length === 0) return setError(L.empty);
    setBusy(true);
    const result = await submitWholesaleRequest(
      chosen.map((c) => ({
        slug: c.product.slug,
        variant: c.line.variant,
        qty: c.qty,
        addons: c.addons,
      })),
      note
    );
    setBusy(false);
    if (!result.ok) {
      if (result.error === "rate_limited") return setError(L.rateLimited);
      if (result.error === "not_approved") return setError(L.notApproved);
      if (result.error === "no_price_book") return setError(L.noBookBody);
      if (result.error === "unpriced_line") return setError(L.unpricedLine);
      return setError(L.failed);
    }
    setDone(result.reference ?? "");
    setQty({});
    setOpts({});
    setNote("");
  };

  if (done !== null) {
    return (
      <div className="max-w-[560px] py-10">
        <h1 className="font-display text-4xl md:text-5xl mb-5" style={{ color: "var(--text)" }}>
          {L.doneTitle}
        </h1>
        {done && (
          <>
            <p className="text-xs tracking-[0.2em] uppercase mb-1" style={{ color: "var(--text-faint)" }}>
              {L.ref}
            </p>
            <p dir="ltr" className="text-2xl font-medium mb-6 tracking-[0.06em]" style={{ color: "var(--text)" }}>
              {done}
            </p>
          </>
        )}
        <p className="text-base leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
          {L.doneBody}
        </p>
        <button
          onClick={() => setDone(null)}
          className="inline-flex h-12 px-8 rounded-full items-center justify-center text-[15px] font-medium transition-opacity hover:opacity-85"
          style={{ background: "var(--accent)", color: "#111114" }}
        >
          {L.another}
        </button>
      </div>
    );
  }

  /** The configured unit price as a string, or null when it has none. */
  const unitLabel = (product: PortalProduct, line?: PortalLine) => {
    if (!line) return null;
    const u = effectiveUnit(product, line, opts[line.key] ?? NO_ADDONS);
    return u ? formatMoney(u, currency) : null;
  };

  const grouped = CATEGORY_ORDER.map((c) => ({
    key: c,
    label: L.categories[c] ?? c,
    items: products.filter((p) => p.category === c),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <header className="mb-10">
        <p className="text-xs tracking-[0.25em] uppercase mb-3" style={{ color: "var(--accent-ink)" }}>
          {partner.company}
        </p>
        <h1 className="font-display text-4xl md:text-6xl mb-4" style={{ color: "var(--text)" }}>
          {L.title}
        </h1>
        <p className="text-base leading-relaxed max-w-2xl" style={{ color: "var(--text-muted)" }}>
          {L.intro}
        </p>
      </header>

      {/* NO BOOK, NO NUMBERS. Said once at the top rather than repeated as a
          dash on forty rows — the partner needs to know it is our side that is
          unfinished, not that we sell nothing. */}
      {!hasBook && (
        <div
          className="mb-8 p-5 rounded-[6px]"
          style={{ background: "var(--bg-soft)", border: "1px solid var(--border)" }}
        >
          <p className="text-[15px] font-medium mb-1" style={{ color: "var(--text)" }}>
            {L.noBookTitle}
          </p>
          <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {L.noBookBody}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 text-sm px-4 py-3 rounded-lg" style={{ background: "#fdecec", color: "#b42318" }}>
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-10 items-start">
        <div>
          {grouped.map((group) => (
            <section key={group.key} className="mb-10">
              <h2
                className="text-xs tracking-[0.25em] uppercase mb-4 pb-3"
                style={{ color: "var(--text-faint)", borderBottom: "1px solid var(--border)" }}
              >
                {group.label}
              </h2>
              <ul className="flex flex-col">
                {group.items.map((p, i) => {
                  const hasColours = p.lines.length > 1 || p.lines[0]?.variant !== null;
                  return (
                    <li
                      key={p.slug}
                      className="py-4"
                      style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 shrink-0" style={{ background: "#f5f5f5" }}>
                          <Image src={p.image} alt={p.name} fill sizes="64px" className="object-contain p-1.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Product names are never translated — same rule as
                              the retail storefront. */}
                          <p className="text-[15px] font-medium leading-snug" style={{ color: "var(--text)" }}>
                            {p.name}
                          </p>
                          {/* A product with colours prices each one on its own
                              row below; only a plain product shows a price
                              here. */}
                          {!hasColours && (
                            <p className="text-[12.5px] mt-0.5 tabular-nums" style={{ color: "var(--text-muted)" }}>
                              {/* Follows the toggles: ticking a lid moves this
                                  figure, so the partner sees what a unit of
                                  the thing they are actually configuring
                                  costs rather than the bare product. */}
                              {unitLabel(p, p.lines[0]) ?? L.noPrice}
                            </p>
                          )}
                          {hasColours && (
                            <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-faint)" }}>
                              {L.perColour}
                            </p>
                          )}
                        </div>
                        {!hasColours && p.lines[0] && (
                          <QtyBox
                            id={p.lines[0].key}
                            label={`${L.qtyLabel} — ${p.name}`}
                            value={qty[p.lines[0].key] ?? 0}
                            onChange={(raw) => setQuantity(p.lines[0].key, raw)}
                          />
                        )}
                      </div>

                      {/* Options for a product with no colours sit under the
                          row, indented past the thumbnail. */}
                      {!hasColours && p.lines[0] && (
                        <div className="ms-20">
                          <AddonChips
                            addons={p.addons}
                            chosen={opts[p.lines[0].key] ?? NO_ADDONS}
                            locale={locale}
                            onToggle={(a) => toggleAddon(p.lines[0].key, a)}
                          />
                        </div>
                      )}

                      {/* ---- The colour picker -----------------------------
                          Every colour is on screen with its own box, rather
                          than one box behind a selector. A trade order is
                          routinely "40 black and 15 purple", and a picker that
                          swapped which colour the single box meant would make
                          that two submissions or, worse, silently the second
                          colour only. */}
                      {hasColours && (
                        <ul
                          className="mt-3 ms-20 flex flex-col gap-3 ps-4"
                          style={{ borderInlineStart: "1px solid var(--border)" }}
                        >
                          {p.lines.map((line) => (
                            <li key={line.key}>
                              <div className="flex items-center gap-3">
                                {/* The swatch is decorative: the colour's NAME
                                    is right beside it, so nothing here is
                                    carried by colour alone. */}
                                <span
                                  aria-hidden="true"
                                  className="w-5 h-5 rounded-full shrink-0"
                                  style={{
                                    background: line.swatch ?? "transparent",
                                    boxShadow: "0 0 0 1px var(--border-strong)",
                                  }}
                                />
                                <span className="text-[14px] min-w-0 flex-1" style={{ color: "var(--text)" }}>
                                  {line.label}
                                  <span className="ms-2 text-[12.5px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                                    {unitLabel(p, line) ?? L.noPrice}
                                  </span>
                                </span>
                                <QtyBox
                                  id={line.key}
                                  label={`${L.qtyLabel} — ${p.name} — ${line.label}`}
                                  value={qty[line.key] ?? 0}
                                  onChange={(raw) => setQuantity(line.key, raw)}
                                />
                              </div>

                              {/* EACH COLOUR CARRIES ITS OWN OPTIONS, and they
                                  sit inside the colour's own row — visible from
                                  the first look, like they are on a product
                                  with no colours.

                                  They used to live in a separate list below,
                                  revealed only once a quantity had been typed.
                                  The intent was less clutter; the effect was
                                  that HMD TCT OP appeared to have no lid and no
                                  FEAR 9E418 at all, which is the one thing an
                                  options control must never do. Black with a
                                  lid and Purple without is an ordinary trade
                                  order, and you have to be able to SEE that it
                                  is possible before you type anything. */}
                              <div className="ms-8">
                                <AddonChips
                                  addons={p.addons}
                                  chosen={opts[line.key] ?? NO_ADDONS}
                                  locale={locale}
                                  onToggle={(a) => toggleAddon(line.key, a)}
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}

                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        {/* The summary rail. Sticky on desktop, and on a phone it simply falls
            below the list — a fixed bar would sit on top of the quantity boxes
            it exists to summarise. */}
        <aside
          className="lg:sticky lg:top-28 p-6 rounded-[6px]"
          style={{ background: "var(--bg-soft)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-[15px] font-medium mb-4" style={{ color: "var(--text)" }}>
            {L.summary}
          </h2>

          {chosen.length === 0 ? (
            <p className="text-[13px] leading-relaxed mb-5" style={{ color: "var(--text-faint)" }}>
              {L.empty}
            </p>
          ) : (
            <>
              <ul className="flex flex-col gap-2 mb-4">
                {chosen.map((c) => (
                  <li key={c.line.key} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="min-w-0" style={{ color: "var(--text-muted)" }}>
                      <span dir="ltr" className="tabular-nums" style={{ color: "var(--text)" }}>
                        {c.qty}
                      </span>
                      {" × "}
                      {c.product.name}
                      {/* The colour is part of what was ordered, so it belongs
                          in the summary the partner checks before sending. */}
                      {c.line.variant && (
                        <span style={{ color: "var(--text-faint)" }}> · {c.line.variant}</span>
                      )}
                      {/* What this line is configured as — the summary is the
                          last thing they read before sending, so it has to
                          carry every choice the row above captured. */}
                      {c.product.addons.filter((k) => c.addons[k]).length > 0 && (
                        <span style={{ color: "var(--text-faint)" }}>
                          {" · "}
                          {c.product.addons
                            .filter((k) => c.addons[k])
                            .map((k) => t(locale, ADDON_SPEC[k]))
                            .join(" + ")}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {c.unit
                        ? formatMoney(money(Math.round(c.unit.eur * c.qty * 100) / 100, c.unit.uah * c.qty), currency)
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>

              <div
                className="flex items-baseline justify-between gap-3 pt-4 mb-1"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                  {`${units} ${L.units} · ${chosen.length} ${L.lines}`}
                </span>
              </div>

              {total ? (
                <>
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span className="text-[14px]" style={{ color: "var(--text)" }}>
                      {L.estimate}
                    </span>
                    <span className="text-[19px] font-medium tabular-nums" style={{ color: "var(--text)" }}>
                      {formatMoney(total, currency)}
                    </span>
                  </div>
                  <p className="text-[12px] leading-snug mb-5" style={{ color: "var(--text-faint)" }}>
                    {L.exShipping}
                  </p>
                </>
              ) : (
                <p className="text-[12.5px] leading-relaxed mb-5 mt-2" style={{ color: "var(--accent-ink)" }}>
                  {L.unpricedLine}
                </p>
              )}
            </>
          )}

          <label className="block text-xs tracking-[0.2em] uppercase mb-2" style={{ color: "var(--text-faint)" }} htmlFor="wh-note">
            {L.note}
          </label>
          <textarea
            id="wh-note"
            className="field"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <button
            onClick={send}
            disabled={busy || chosen.length === 0 || !hasBook || unpriced}
            className="w-full h-12 mt-4 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85 disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#111114" }}
          >
            {L.submit}
          </button>

          {chosen.length > 0 && (
            <button
              onClick={() => setQty({})}
              className="w-full h-10 mt-2 text-[13px] underline underline-offset-4 transition-opacity hover:opacity-70"
              style={{ color: "var(--text-faint)" }}
            >
              {L.clear}
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
