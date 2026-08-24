"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { t } from "@/lib/i18n-text";
import { currencyForLocale, formatMoney, money, type Money } from "@/lib/currency";
import { submitWholesaleRequest } from "@/app/actions/wholesale";
import type { PortalPartner } from "@/lib/wholesale-display";

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
};

type Qty = Record<string, number>;

/** A chosen line, flattened out of the grouped catalogue for the summary. */
type Chosen = { product: PortalProduct; line: PortalLine; qty: number };

const CATEGORY_ORDER = ["bowl", "hmd", "windcover", "accessory"] as const;

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
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const currency = currencyForLocale(locale);

  const L = {
    title: t(locale, { en: "Wholesale ordering", uk: "Оптове замовлення", ja: "卸売のご注文", ar: "الطلب بالجملة" }),
    intro: t(locale, {
      en: "Set the quantities you need and send the list. We'll confirm availability and email you the payment details — nothing is charged here.",
      uk: "Вкажіть потрібні кількості та надішліть список. Ми підтвердимо наявність і надішлемо реквізити для оплати — тут нічого не списується.",
      ja: "必要な数量を入力してリストをお送りください。在庫を確認のうえ、お支払い方法をメールでご案内します。この画面でのご請求はありません。",
      ar: "حدّد الكميات التي تحتاجها وأرسل القائمة. سنؤكّد التوفّر ونرسل تفاصيل الدفع عبر البريد الإلكتروني — ولا يُخصم شيء هنا.",
    }),
    quote: t(locale, { en: "Quote on request", uk: "Ціна за запитом", ja: "お見積り", ar: "السعر عند الطلب" }),
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
    estimate: t(locale, { en: "Indicative total", uk: "Орієнтовна сума", ja: "参考合計", ar: "الإجمالي التقديري" }),
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
        if (n > 0) out.push({ product, line, qty: n });
      }
    }
    return out;
  }, [products, qty]);

  const units = chosen.reduce((s, c) => s + c.qty, 0);

  /* Only when every chosen line is priced — see the header comment. */
  const total: Money | null = useMemo(() => {
    if (chosen.length === 0 || chosen.some((c) => c.line.priceEur === null || c.line.priceUah === null)) {
      return null;
    }
    return chosen.reduce(
      (acc, c) => ({
        eur: acc.eur + (c.line.priceEur ?? 0) * c.qty,
        uah: acc.uah + (c.line.priceUah ?? 0) * c.qty,
      }),
      money(0, 0)
    );
  }, [chosen]);

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
      chosen.map((c) => ({ slug: c.product.slug, variant: c.line.variant, qty: c.qty })),
      note
    );
    setBusy(false);
    if (!result.ok) {
      if (result.error === "rate_limited") return setError(L.rateLimited);
      if (result.error === "not_approved") return setError(L.notApproved);
      return setError(L.failed);
    }
    setDone(result.reference ?? "");
    setQty({});
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

  /** One line's unit price, or null when no dealer price is set for it. */
  const priceOf = (line?: PortalLine) =>
    line && line.priceEur !== null && line.priceUah !== null
      ? formatMoney(money(line.priceEur, line.priceUah), currency)
      : null;

  /* The quantity box, shared by plain products and colour rows so the two can
     never drift apart in size or behaviour. */
  const QtyBox = ({ line, label }: { line: PortalLine; label: string }) => {
    const n = qty[line.key] ?? 0;
    return (
      <div className="shrink-0">
        <label className="sr-only" htmlFor={`qty-${line.key}`}>
          {`${L.qtyLabel} — ${label}`}
        </label>
        <input
          id={`qty-${line.key}`}
          className="w-[84px] h-11 text-center text-[15px] tabular-nums rounded-[4px]"
          style={{
            border: `1px solid ${n > 0 ? "var(--text)" : "var(--border-strong)"}`,
            background: "#ffffff",
            color: "var(--text)",
          }}
          dir="ltr"
          inputMode="numeric"
          type="text"
          value={n === 0 ? "" : String(n)}
          placeholder="0"
          onChange={(e) => setQuantity(line.key, e.target.value)}
        />
      </div>
    );
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
                            <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                              {priceOf(p.lines[0]) ?? L.quote}
                            </p>
                          )}
                          {hasColours && (
                            <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-faint)" }}>
                              {L.perColour}
                            </p>
                          )}
                        </div>
                        {!hasColours && p.lines[0] && <QtyBox line={p.lines[0]} label={p.name} />}
                      </div>

                      {/* ---- The colour picker -----------------------------
                          Every colour is on screen with its own box, rather
                          than one box behind a selector. A trade order is
                          routinely "40 black and 15 purple", and a picker that
                          swapped which colour the single box meant would make
                          that two submissions or, worse, silently the second
                          colour only. */}
                      {hasColours && (
                        <ul
                          className="mt-3 ms-20 flex flex-col gap-2 ps-4"
                          style={{ borderInlineStart: "1px solid var(--border)" }}
                        >
                          {p.lines.map((line) => (
                            <li key={line.key} className="flex items-center gap-3">
                              {/* The swatch is decorative: the colour's NAME is
                                  right beside it, so nothing here is carried by
                                  colour alone. */}
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
                                <span className="ms-2 text-[12.5px]" style={{ color: "var(--text-muted)" }}>
                                  {priceOf(line) ?? L.quote}
                                </span>
                              </span>
                              <QtyBox line={line} label={`${p.name} — ${line.label}`} />
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
                    </span>
                    <span className="shrink-0 tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {c.line.priceEur !== null && c.line.priceUah !== null
                        ? formatMoney(money(c.line.priceEur * c.qty, c.line.priceUah * c.qty), currency)
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
                <div className="flex items-baseline justify-between gap-3 mb-5">
                  <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                    {L.estimate}
                  </span>
                  <span className="text-[17px] font-medium tabular-nums" style={{ color: "var(--text)" }}>
                    {formatMoney(total, currency)}
                  </span>
                </div>
              ) : (
                <p className="text-[12.5px] leading-relaxed mb-5 mt-2" style={{ color: "var(--text-faint)" }}>
                  {L.willQuote}
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
            disabled={busy || chosen.length === 0}
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
