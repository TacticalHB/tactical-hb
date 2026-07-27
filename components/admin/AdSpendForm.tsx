"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addAdSpend } from "@/app/actions/marketing";
import {
  MARKETING_CHANNELS,
  channelLabel,
  type MarketingChannel,
} from "@/lib/marketing-display";

/* ---------------------------------------------------------------------------
   Record ad spend for a month.

   This is a diary of money ALREADY spent elsewhere — nothing here talks to
   any ad platform. Results (clicks, orders) usually arrive after the money
   does; they can be left empty now and filled in from the row later. Empty
   means "not measured", which the strategist repeats honestly — it is not
   the same as zero.
--------------------------------------------------------------------------- */

export default function AdSpendForm({
  defaultMonth,
  uk,
}: {
  defaultMonth: string;
  uk: boolean;
}) {
  const router = useRouter();

  const [channel, setChannel] = useState<MarketingChannel>("meta");
  const [month, setMonth] = useState(defaultMonth);
  const [campaign, setCampaign] = useState("");
  const [amountUah, setAmountUah] = useState("");
  const [amountEur, setAmountEur] = useState("");
  const [clicks, setClicks] = useState("");
  const [ordersAttributed, setOrdersAttributed] = useState("");
  const [note, setNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    title: uk ? "Додати витрату" : "Record spend",
    channel: uk ? "Канал" : "Channel",
    month: uk ? "Місяць" : "Month",
    campaign: uk ? "Кампанія (необов'язково)" : "Campaign (optional)",
    amount: "₴",
    amountEur: "€ (opt.)",
    clicks: uk ? "Кліки" : "Clicks",
    orders: uk ? "Замовлення" : "Orders",
    note: uk ? "Нотатка" : "Note",
    add: uk ? "Додати" : "Add",
  };

  const errors: Record<string, string> = {
    bad_channel: uk ? "Невідомий канал." : "Unknown channel.",
    bad_month: uk ? "Місяць має бути у форматі 2026-08." : "The month must look like 2026-08.",
    bad_amount: uk ? "Перевірте суму." : "Check the amount.",
    bad_number: uk ? "Кліки й замовлення — цілі числа." : "Clicks and orders must be whole numbers.",
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await addAdSpend({
      channel,
      month,
      campaign,
      amountUah,
      amountEur,
      clicks,
      ordersAttributed,
      note,
    });
    setBusy(false);
    if (res.ok) {
      setCampaign("");
      setAmountUah("");
      setAmountEur("");
      setClicks("");
      setOrdersAttributed("");
      setNote("");
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
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as MarketingChannel)}
          aria-label={L.channel}
          className={inputClass}
          style={inputStyle}
        >
          {MARKETING_CHANNELS.map((c) => (
            <option key={c} value={c}>
              {channelLabel(c, uk)}
            </option>
          ))}
        </select>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          aria-label={L.month}
          className={`${inputClass} w-[150px]`}
          style={inputStyle}
        />
        <input
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
          placeholder={L.campaign}
          autoComplete="off"
          aria-label={L.campaign}
          className={`${inputClass} w-[190px] flex-1 min-w-[160px]`}
          style={inputStyle}
        />
        <input
          value={amountUah}
          onChange={(e) => setAmountUah(e.target.value)}
          placeholder={L.amount}
          inputMode="decimal"
          autoComplete="off"
          aria-label={`${L.title} — UAH`}
          className={`${inputClass} w-[110px] tabular-nums`}
          style={inputStyle}
        />
        <input
          value={amountEur}
          onChange={(e) => setAmountEur(e.target.value)}
          placeholder={L.amountEur}
          inputMode="decimal"
          autoComplete="off"
          aria-label={`${L.title} — EUR`}
          className={`${inputClass} w-[90px] tabular-nums`}
          style={inputStyle}
        />
        <input
          value={clicks}
          onChange={(e) => setClicks(e.target.value)}
          placeholder={L.clicks}
          inputMode="numeric"
          autoComplete="off"
          aria-label={L.clicks}
          className={`${inputClass} w-[90px] tabular-nums`}
          style={inputStyle}
        />
        <input
          value={ordersAttributed}
          onChange={(e) => setOrdersAttributed(e.target.value)}
          placeholder={L.orders}
          inputMode="numeric"
          autoComplete="off"
          aria-label={L.orders}
          className={`${inputClass} w-[110px] tabular-nums`}
          style={inputStyle}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={L.note}
          autoComplete="off"
          aria-label={L.note}
          className={`${inputClass} flex-1 min-w-[140px]`}
          style={inputStyle}
        />

        <button
          type="submit"
          disabled={busy || !amountUah.trim()}
          className="h-9 px-4 text-[13px] rounded transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-default"
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
