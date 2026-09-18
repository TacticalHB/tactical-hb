"use client";

import { useState } from "react";
import { products, availabilityOf, availabilityText } from "@/lib/products";
import { unitPrice, PARTNER_TYPES, type PartnerType } from "@/lib/wholesale-prices";
import { NO_ADDONS, addonsFor, type AddonKey, type LineAddons, type RequestItem } from "@/lib/wholesale-display";
import { formatMoney, money } from "@/lib/currency";
import { saveRequestLines } from "@/app/actions/wholesale-admin";

/* ---------------------------------------------------------------------------
   Editing what a partner actually ordered.

   THE FORM IS NOT THE ORDER. A partner sends what they think they want, the
   two sides settle it by email, and the agreed order is rarely the submitted
   one — this request's own note asks for fifty-four lids that are not on any
   line. Recording that used to mean asking the partner to submit again, which
   is asking the customer to redo work the conversation already finished.

   PRICES ARE SHOWN HERE AND DECIDED ON THE SERVER. Every figure in this
   component is for the reader; the action sends slugs, colours and quantities
   and nothing else, and lib/wholesale-portal reprices the lot from the
   request's own book. An admin screen is still a browser.

   ONE BOOK, THE REQUEST'S OWN. partnerType is snapshotted at submit so that a
   repricing cannot restate an order already quoted; the editor honours the
   same snapshot rather than the partner's current book.
--------------------------------------------------------------------------- */

type Draft = {
  /** Stable across re-renders so React can key rows that share a slug. */
  key: string;
  slug: string;
  variant: string | null;
  addons: LineAddons;
  qty: number;
  /**
   * The unit price this configuration was already quoted, if it was.
   *
   * SHOWN BECAUSE IT IS WHAT WILL BE SAVED. The server keeps an existing
   * line's quoted price rather than repricing it from a book that may have
   * moved since — so if this component displayed today's book, the total on
   * screen would not be the total written down. New lines have none and are
   * priced from the book, which is the other half of the same rule.
   */
  quoted: { eur: number; uah: number } | null;
};

let seq = 0;
const nextKey = () => `d${++seq}`;

/** Every orderable configuration, as one flat list for the picker. */
function pickable(book: PartnerType) {
  const out: { value: string; label: string; slug: string; variant: string | null; note: string }[] = [];
  for (const p of products) {
    if (p.incoming) continue; // the withheld listing has no trade price at all
    const status = availabilityOf(p);
    /* UNAVAILABLE PRODUCTS ARE OFFERED, AND MARKED. A negotiated order can
       legitimately include something still in transit — that is exactly what
       this request's note asks for — so the decision is left to the person
       making it rather than taken by a filter. The label says which. */
    const note = status === "available" ? "" : availabilityText(status, "en");
    const variants = p.variants?.length ? p.variants.map((v) => v.name) : [null];
    for (const variant of variants) {
      const price = unitPrice(book, p.slug, NO_ADDONS, variant);
      if (!price) continue; // no trade price on this book — nothing to quote
      out.push({
        value: `${p.slug}|${variant ?? ""}`,
        slug: p.slug,
        variant,
        label: variant ? `${p.nameEn} — ${variant}` : p.nameEn,
        note,
      });
    }
  }
  return out;
}

export default function RequestLineEditor({
  requestId,
  status,
  book,
  currency,
  items,
  uk,
}: {
  requestId: string;
  status: string;
  book: PartnerType | null;
  currency: "EUR" | "UAH" | null;
  items: RequestItem[];
  uk: boolean;
}) {
  const [open, setOpen] = useState(false);
  /* Which book this request is priced from. Defaults to its own snapshot;
     changing it reprices every line and is the correction for a partner who
     was on the wrong book when they ordered. */
  const [useBook, setUseBook] = useState<PartnerType | null>(book);
  const [draft, setDraft] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const L = {
    edit: uk ? "Редагувати позиції" : "Edit lines",
    cancel: uk ? "Скасувати" : "Cancel",
    save: uk ? "Зберегти позиції" : "Save lines",
    saving: uk ? "Збереження…" : "Saving…",
    add: uk ? "Додати товар…" : "Add a product…",
    remove: uk ? "Прибрати" : "Remove",
    qty: uk ? "К-сть" : "Qty",
    total: uk ? "Разом" : "Total",
    empty: uk ? "Жодної позиції — додайте товар або скасуйте." : "No lines — add a product or cancel.",
    paid: uk
      ? "Позиції оплаченого запиту не редагуються: склад уже списано за старими рядками. Переведіть статус з «Оплачено» (склад повернеться), відредагуйте, потім поставте «Оплачено» знову."
      : "A paid request cannot be edited: stock has already come off the shelf against the old lines. Move it off Paid — that puts every unit back — then edit, then mark it Paid again.",
    noBook: uk ? "У запиту немає прайсу, тож ціни не порахувати." : "This request has no price book, so nothing can be priced.",
    saved: (n: number, u: number) =>
      uk ? `Збережено: ${n} позицій, ${u} одиниць` : `Saved — ${n} line${n === 1 ? "" : "s"}, ${u} unit${u === 1 ? "" : "s"}`,
    failed: uk ? "Не вдалося зберегти." : "Could not save.",
    quotedAt: uk ? "за старою ціною" : "at quoted price",
    addonLabels: {
      lid: "Lid 9E418",
      rubber: "FEAR 9E418",
      timer: uk ? "Таймер" : "Timer",
    } as Record<AddonKey, string>,
    bookLabel: uk ? "Прайс запиту" : "Priced from",
    repriceWarn: uk
      ? "Зміна прайсу перерахує ВСІ позиції за новим списком — узгоджені ціни не зберігаються. Прайс самого партнера змінюється на його картці."
      : "Changing the book reprices EVERY line from the new list — agreed prices are not kept. The partner's own book is changed on their partner card, not here.",
    quotedNote: uk
      ? "Позиції, що вже були в запиті, зберігають ціну, за якою їх прорахували. Нові рядки рахуються за чинним прайсом."
      : "Lines already on the request keep the price they were quoted. New lines are priced from the current book.",
  };

  if (!book) {
    return <p className="text-[12.5px]" style={{ color: "var(--console-faint)" }}>{L.noBook}</p>;
  }

  const priceBook = useBook ?? book;
  const options = pickable(priceBook);
  const repricing = priceBook !== book;
  const cur = currency ?? "EUR";

  const begin = () => {
    setError(null);
    setNote(null);
    setDraft(
      items.map((i) => ({
        key: nextKey(),
        slug: i.productSlug,
        variant: i.variant,
        /* Existing add-ons ride along untouched. They were part of what the
           partner configured, and this editor changes quantities and products
           — it does not silently drop a fitted lid. */
        addons: i.addons ?? NO_ADDONS,
        qty: i.qty,
        quoted:
          i.unitPriceEur !== null && i.unitPriceUah !== null
            ? { eur: i.unitPriceEur, uah: i.unitPriceUah }
            : null,
      }))
    );
    setOpen(true);
  };

  /* When the book is being changed, nothing is inherited — that is the point
     of changing it, and the server applies the same rule. */
  const lineMoney = (d: Draft) =>
    repricing ? unitPrice(priceBook, d.slug, d.addons, d.variant) : d.quoted ?? unitPrice(priceBook, d.slug, d.addons, d.variant);

  /* A quoted price that today's book no longer matches. Worth marking: it is
     the difference between honouring a quote and noticing you are about to. */
  const movedSince = (d: Draft) => {
    if (!d.quoted || repricing) return false;
    const now = unitPrice(priceBook, d.slug, d.addons, d.variant);
    return !!now && (now.eur !== d.quoted.eur || now.uah !== d.quoted.uah);
  };

  const total = draft.reduce(
    (s, d) => {
      const m = lineMoney(d);
      return m ? { eur: s.eur + m.eur * d.qty, uah: s.uah + m.uah * d.qty } : s;
    },
    { eur: 0, uah: 0 }
  );

  const save = async () => {
    setBusy(true);
    setError(null);
    const res = await saveRequestLines(
      requestId,
      draft.map((d) => ({ slug: d.slug, variant: d.variant, addons: d.addons, qty: d.qty })),
      repricing ? priceBook : undefined
    );
    setBusy(false);
    if (res.ok) {
      setNote(L.saved(res.lines, res.itemCount));
      setOpen(false);
      return;
    }
    setError(res.error === "paid" ? L.paid : L.failed);
  };

  if (!open) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={begin}
          disabled={status === "paid"}
          title={status === "paid" ? L.paid : undefined}
          className="h-8 px-3 text-[12.5px] rounded transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ border: "1px solid var(--console-border)", color: "var(--console-text)" }}
        >
          {L.edit}
        </button>
        {status === "paid" && (
          <span className="text-[12px] max-w-xl leading-relaxed" style={{ color: "var(--console-warn)" }}>
            {L.paid}
          </span>
        )}
        {note && (
          <span className="text-[12px]" style={{ color: "var(--console-ok)" }}>
            {note}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="mt-4 rounded p-4"
      style={{ border: "1px solid var(--console-border)", background: "var(--console-panel-2)" }}
    >
      {draft.length === 0 && (
        <p className="text-[12.5px] mb-3" style={{ color: "var(--console-faint)" }}>{L.empty}</p>
      )}

      <div className="flex flex-col gap-2">
        {draft.map((d, i) => {
          const m = lineMoney(d);
          const label = options.find((o) => o.slug === d.slug && o.variant === d.variant)?.label ?? d.slug;
          return (
            <div key={d.key} className="flex flex-wrap items-center gap-3 text-[13px]">
              <span className="flex-1 min-w-[180px]" style={{ color: "var(--console-text)" }}>
                {label}
                {/* The add-ons this product actually takes, read from the same
                    rule the partner portal reads — a bowl can never be offered
                    a timer. Toggling one changes the CONFIGURATION, so the
                    quoted price stops applying and the line reprices from the
                    book: the server matches a quote on sku AND add-ons, and a
                    cover with a timer was never the thing that was quoted. */}
                {(() => {
                  const product = products.find((x) => x.slug === d.slug);
                  const keys = product ? addonsFor(product) : [];
                  if (keys.length === 0) return null;
                  return (
                    <span className="ms-3 inline-flex gap-1.5">
                      {keys.map((k) => {
                        const on = d.addons[k];
                        return (
                          <button
                            key={k}
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              setDraft((rows) =>
                                rows.map((r, j) =>
                                  j === i
                                    ? { ...r, addons: { ...r.addons, [k]: !on }, quoted: null }
                                    : r
                                )
                              )
                            }
                            className="px-2 py-0.5 text-[11px] rounded transition-colors"
                            style={{
                              border: `1px solid ${on ? "var(--console-accent)" : "var(--console-border)"}`,
                              color: on ? "var(--console-accent)" : "var(--console-muted)",
                              background: "transparent",
                            }}
                          >
                            {L.addonLabels[k]}
                          </button>
                        );
                      })}
                    </span>
                  );
                })()}
                {movedSince(d) && (
                  <span className="ms-2 text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--console-warn)" }}>
                    {L.quotedAt}
                  </span>
                )}
              </span>
              <label className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--console-faint)" }}>
                  {L.qty}
                </span>
                <input
                  value={d.qty}
                  inputMode="numeric"
                  onChange={(e) => {
                    const n = Math.floor(Number(e.target.value.replace(/[^\d]/g, "")));
                    setDraft((rows) =>
                      rows.map((r, j) => (j === i ? { ...r, qty: Number.isFinite(n) && n > 0 ? n : 0 } : r))
                    );
                  }}
                  className="h-8 w-20 px-2 text-[13px] rounded text-right tabular-nums outline-none"
                  style={{ border: "1px solid var(--console-border)", background: "transparent", color: "var(--console-text)" }}
                />
              </label>
              <span className="w-28 text-right tabular-nums" style={{ color: "var(--console-muted)" }}>
                {m ? formatMoney(money(m.eur * d.qty, m.uah * d.qty), cur) : "—"}
              </span>
              <button
                type="button"
                onClick={() => setDraft((rows) => rows.filter((_, j) => j !== i))}
                className="text-[12px] underline underline-offset-2"
                style={{ color: "var(--console-alert)" }}
              >
                {L.remove}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[12.5px]" style={{ color: "var(--console-muted)" }}>
          {L.bookLabel}
          <select
            value={priceBook}
            onChange={(e) => setUseBook(e.target.value as PartnerType)}
            className="h-8 px-2 text-[13px] rounded outline-none"
            style={{
              border: `1px solid ${repricing ? "var(--console-warn)" : "var(--console-border)"}`,
              background: "transparent",
              color: "var(--console-text)",
            }}
          >
            {PARTNER_TYPES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>

        <select
          value=""
          onChange={(e) => {
            const opt = options.find((o) => o.value === e.target.value);
            if (!opt) return;
            setDraft((rows) => [
              ...rows,
              { key: nextKey(), slug: opt.slug, variant: opt.variant, addons: NO_ADDONS, qty: 1, quoted: null },
            ]);
          }}
          className="h-8 px-2 text-[13px] rounded outline-none"
          style={{ border: "1px solid var(--console-border)", background: "transparent", color: "var(--console-text)" }}
        >
          <option value="">{L.add}</option>
          {options.map((o) => {
            const m = unitPrice(priceBook, o.slug, NO_ADDONS, o.variant)!;
            return (
              <option key={o.value} value={o.value}>
                {o.label} — {formatMoney(m, cur)}
                {o.note ? ` (${o.note})` : ""}
              </option>
            );
          })}
        </select>

        <span className="ml-auto text-[13px] tabular-nums" style={{ color: "var(--console-text)" }}>
          {L.total}: {formatMoney(money(total.eur, total.uah), cur)}
        </span>
      </div>

      <p
        className="mt-2 text-[11.5px] leading-relaxed"
        style={{ color: repricing ? "var(--console-warn)" : "var(--console-faint)" }}
      >
        {repricing ? L.repriceWarn : L.quotedNote}
      </p>

      {error && (
        <p className="mt-3 text-[12.5px] max-w-xl leading-relaxed" style={{ color: "var(--console-alert)" }}>
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy || draft.length === 0 || draft.some((d) => d.qty <= 0)}
          className="h-8 px-4 text-[12.5px] rounded transition-opacity hover:opacity-85 disabled:opacity-40"
          style={{ background: "var(--console-accent)", color: "#14151a" }}
        >
          {busy ? L.saving : L.save}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-8 px-3 text-[12.5px] rounded"
          style={{ border: "1px solid var(--console-border)", color: "var(--console-muted)" }}
        >
          {L.cancel}
        </button>
      </div>
    </div>
  );
}
