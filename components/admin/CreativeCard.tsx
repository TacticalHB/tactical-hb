"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteCreative, updateCreative } from "@/app/actions/marketing";
import {
  CREATIVE_KINDS,
  CREATIVE_STATUSES,
  MARKETING_CHANNELS,
  channelLabel,
  creativeStatusLabel,
  creativeStatusTone,
  kindLabel,
  type Creative,
  type CreativeKind,
  type CreativeStatus,
  type MarketingChannel,
} from "@/lib/marketing-display";
import type { StockOption } from "@/components/admin/CreativeForm";

/* ---------------------------------------------------------------------------
   One creative: the reading row, and underneath it (opened on demand) the
   editing surface. Status moves — pause, retire, revive — are edits like any
   other: staged in the select, committed by Save. The strategist may SUGGEST
   pausing a creative; this card is where a human actually does it.
--------------------------------------------------------------------------- */

export default function CreativeCard({
  creative,
  stockOptions,
  uk,
}: {
  creative: Creative;
  stockOptions: StockOption[];
  uk: boolean;
}) {
  const router = useRouter();
  const c = creative;

  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState(c.title);
  const [kind, setKind] = useState<CreativeKind>(c.kind);
  const [url, setUrl] = useState(c.url ?? "");
  const [channels, setChannels] = useState<MarketingChannel[]>(c.channels);
  const [productSku, setProductSku] = useState(c.productSku ?? "");
  const [status, setStatus] = useState<CreativeStatus>(c.status);
  const [notes, setNotes] = useState(c.notes ?? "");

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const tone = creativeStatusTone(c.status);
  const productLabel =
    c.productSku === null
      ? null
      : stockOptions.find((o) => o.sku === c.productSku)?.label ?? c.productSku;

  const L = {
    edit: uk ? "Редагувати" : "Edit",
    close: uk ? "Згорнути" : "Close",
    save: uk ? "Зберегти" : "Save",
    saved: uk ? "Збережено" : "Saved",
    openLink: uk ? "Відкрити" : "Open",
    name: uk ? "Назва" : "Title",
    url: uk ? "Посилання" : "Link",
    product: uk ? "Товар" : "Product",
    noProduct: uk ? "— без товару —" : "— no product —",
    notes: uk ? "Нотатки / текст" : "Notes / copy text",
    remove: uk ? "Видалити" : "Delete",
    confirmRemove: uk
      ? `Видалити креатив «${c.title}»?`
      : `Delete the creative “${c.title}”?`,
  };

  const errors: Record<string, string> = {
    no_title: uk ? "Вкажіть назву креативу." : "Enter a title for the creative.",
    bad_sku: uk ? "Такого товару немає на складі." : "That product isn't on the stock register.",
    bad_channel: uk ? "Невідомий канал." : "Unknown channel.",
  };

  function toggleChannel(ch: MarketingChannel) {
    setChannels((prev) => (prev.includes(ch) ? prev.filter((x) => x !== ch) : [...prev, ch]));
  }

  async function onSave() {
    setBusy("save");
    setError(null);
    setInfo(null);
    const res = await updateCreative(c.id, {
      title,
      kind,
      url,
      channels,
      productSku,
      status,
      notes,
    });
    setBusy(null);
    if (res.ok) {
      setInfo(L.saved);
      router.refresh();
    } else {
      setError(errors[res.error] ?? res.error);
    }
  }

  async function onDelete() {
    if (!window.confirm(L.confirmRemove)) return;
    setBusy("delete");
    setError(null);
    setInfo(null);
    const res = await deleteCreative(c.id);
    setBusy(null);
    if (res.ok) router.refresh();
    else setError(errors[res.error] ?? res.error);
  }

  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--console-border)",
    color: "var(--console-text)",
    background: "var(--console-panel-2)",
  };
  const inputClass =
    "h-9 px-3 text-[13px] rounded outline-none transition-colors focus:border-[color:var(--console-accent-line)]";

  return (
    <div style={{ borderTop: "1px solid var(--console-border)" }}>
      {/* Reading row ---------------------------------------------------- */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 text-[13.5px]">
        <span className="font-medium" style={{ color: "var(--console-text)" }}>
          {c.title}
        </span>
        <span
          className="text-[11px] tracking-[0.1em] uppercase px-2 py-0.5 rounded"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {creativeStatusLabel(c.status, uk)}
        </span>
        <span style={{ color: "var(--console-muted)" }}>{kindLabel(c.kind, uk)}</span>
        {c.channels.length > 0 && (
          <span style={{ color: "var(--console-muted)" }}>
            {c.channels.map((ch) => channelLabel(ch, uk)).join(" · ")}
          </span>
        )}
        {productLabel && <span style={{ color: "var(--console-muted)" }}>{productLabel}</span>}
        {c.url && (
          <a
            href={c.url}
            target="_blank"
            rel="noreferrer"
            className="text-[12.5px] underline-offset-2 hover:underline"
            style={{ color: "var(--console-muted)" }}
          >
            {L.openLink} ↗
          </a>
        )}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="ml-auto text-[12.5px] underline-offset-2 hover:underline"
          style={{ color: "var(--console-muted)" }}
        >
          {open ? L.close : L.edit}
        </button>
      </div>

      {/* Editing surface ------------------------------------------------- */}
      {open && (
        <div className="px-5 pb-4">
          <div className="flex flex-wrap gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={L.name}
              autoComplete="off"
              aria-label={`${L.name} — ${c.title}`}
              className={`${inputClass} w-[220px] flex-1 min-w-[180px]`}
              style={inputStyle}
            />
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as CreativeKind)}
              aria-label={`${uk ? "Тип" : "Kind"} — ${c.title}`}
              className={inputClass}
              style={inputStyle}
            >
              {CREATIVE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {kindLabel(k, uk)}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CreativeStatus)}
              aria-label={`Status — ${c.title}`}
              className={inputClass}
              style={inputStyle}
            >
              {CREATIVE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {creativeStatusLabel(s, uk)}
                </option>
              ))}
            </select>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={L.url}
              inputMode="url"
              autoComplete="off"
              aria-label={`${L.url} — ${c.title}`}
              className={`${inputClass} w-[240px] flex-1 min-w-[180px]`}
              style={inputStyle}
            />
            <select
              value={productSku}
              onChange={(e) => setProductSku(e.target.value)}
              aria-label={`${L.product} — ${c.title}`}
              className={`${inputClass} max-w-[220px]`}
              style={inputStyle}
            >
              <option value="">{L.noProduct}</option>
              {stockOptions.map((o) => (
                <option key={o.sku} value={o.sku}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={L.notes}
              autoComplete="off"
              aria-label={`${L.notes} — ${c.title}`}
              className={`${inputClass} flex-1 min-w-[180px]`}
              style={inputStyle}
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {MARKETING_CHANNELS.map((ch) => {
              const on = channels.includes(ch);
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => toggleChannel(ch)}
                  aria-pressed={on}
                  className="h-7 px-2.5 text-[12px] rounded-full transition-colors"
                  style={
                    on
                      ? { background: "var(--console-accent)", color: "#14151a", border: "1px solid var(--console-accent)" }
                      : { background: "transparent", color: "var(--console-muted)", border: "1px solid var(--console-border)" }
                  }
                >
                  {channelLabel(ch, uk)}
                </button>
              );
            })}

            <button
              type="button"
              onClick={onSave}
              disabled={busy !== null}
              className="ml-auto h-9 px-4 text-[13px] rounded transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-default"
              style={{ background: "var(--console-accent)", color: "#14151a" }}
            >
              {busy === "save" ? "…" : L.save}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy !== null}
              className="h-9 px-3 text-[12.5px] rounded transition-opacity hover:opacity-85 disabled:opacity-40"
              style={{ border: "1px solid rgba(196,92,92,0.4)", color: "var(--console-alert)", background: "transparent" }}
            >
              {busy === "delete" ? "…" : L.remove}
            </button>
          </div>

          {(info || error) && (
            <p className="mt-2 text-[12px]" style={{ color: error ? "var(--console-alert)" : "var(--console-ok)" }}>
              {error ?? info}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
