"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCreative } from "@/app/actions/marketing";
import {
  CREATIVE_KINDS,
  MARKETING_CHANNELS,
  channelLabel,
  kindLabel,
  type CreativeKind,
  type MarketingChannel,
} from "@/lib/marketing-display";

/* ---------------------------------------------------------------------------
   Add a creative to the library.

   Title is the only required field: "the winter kit photo set" is worth a
   row even before it has a URL, tags, or a product. The channel chips are
   toggles, not a select — a good visual usually suits two or three channels
   at once, and forcing one would just breed duplicates.
--------------------------------------------------------------------------- */

export type StockOption = { sku: string; label: string };

export default function CreativeForm({
  stockOptions,
  uk,
}: {
  stockOptions: StockOption[];
  uk: boolean;
}) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<CreativeKind>("image");
  const [url, setUrl] = useState("");
  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const [productSku, setProductSku] = useState("");
  const [notes, setNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    title: uk ? "Додати креатив" : "Add a creative",
    name: uk ? "Назва" : "Title",
    kind: uk ? "Тип" : "Kind",
    url: uk ? "Посилання (Drive, Meta…)" : "Link (Drive, Meta…)",
    product: uk ? "Товар" : "Product",
    noProduct: uk ? "— без товару —" : "— no product —",
    notes: uk ? "Нотатки / текст" : "Notes / copy text",
    add: uk ? "Додати" : "Add",
    channels: uk ? "Канали" : "Channels",
  };

  const errors: Record<string, string> = {
    no_title: uk ? "Вкажіть назву креативу." : "Enter a title for the creative.",
    bad_sku: uk ? "Такого товару немає на складі." : "That product isn't on the stock register.",
    bad_channel: uk ? "Невідомий канал." : "Unknown channel.",
  };

  function toggleChannel(c: MarketingChannel) {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createCreative({
      title,
      kind,
      url,
      channels,
      productSku,
      status: "active",
      notes,
    });
    setBusy(false);
    if (res.ok) {
      setTitle("");
      setKind("image");
      setUrl("");
      setChannels([]);
      setProductSku("");
      setNotes("");
      router.refresh();
    } else {
      setError(errors[res.error] ?? res.error);
    }
  }

  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--border-strong)",
    color: "#111",
    background: "#fff",
  };
  const inputClass =
    "h-9 px-3 text-[13px] rounded outline-none transition-colors focus:border-black";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg px-5 py-4"
      style={{ border: "1px solid var(--border)", background: "#fff" }}
    >
      <div className="text-[13px] font-medium mb-3" style={{ color: "#111" }}>
        {L.title}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={L.name}
          autoComplete="off"
          aria-label={L.name}
          className={`${inputClass} w-[220px] flex-1 min-w-[180px]`}
          style={inputStyle}
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as CreativeKind)}
          aria-label={L.kind}
          className={inputClass}
          style={inputStyle}
        >
          {CREATIVE_KINDS.map((k) => (
            <option key={k} value={k}>
              {kindLabel(k, uk)}
            </option>
          ))}
        </select>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={L.url}
          inputMode="url"
          autoComplete="off"
          aria-label={L.url}
          className={`${inputClass} w-[240px] flex-1 min-w-[180px]`}
          style={inputStyle}
        />
        <select
          value={productSku}
          onChange={(e) => setProductSku(e.target.value)}
          aria-label={L.product}
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
          aria-label={L.notes}
          className={`${inputClass} flex-1 min-w-[180px]`}
          style={inputStyle}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label={L.channels}>
        {MARKETING_CHANNELS.map((c) => {
          const on = channels.includes(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggleChannel(c)}
              aria-pressed={on}
              className="h-7 px-2.5 text-[12px] rounded-full transition-colors"
              style={
                on
                  ? { background: "#111", color: "#fff", border: "1px solid #111" }
                  : { background: "#fff", color: "#4a4a4d", border: "1px solid var(--border-strong)" }
              }
            >
              {channelLabel(c, uk)}
            </button>
          );
        })}

        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="ml-auto h-9 px-4 text-[13px] rounded transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-default"
          style={{ background: "#111", color: "#fff" }}
        >
          {busy ? "…" : L.add}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-[12px]" style={{ color: "#b3261e" }}>
          {error}
        </p>
      )}
    </form>
  );
}
