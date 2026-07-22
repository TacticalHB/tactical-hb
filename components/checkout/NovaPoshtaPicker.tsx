"use client";

import { useEffect, useRef, useState } from "react";
import type { CartLine } from "@/components/CartContext";

/* ---------------------------------------------------------------------------
   Nova Poshta branch picker: city → warehouse → price.

   Every lookup goes through our own API routes, so the Nova Poshta key stays
   on the server. The quote shown here is for display; the amount actually
   charged is re-quoted server-side when the invoice is created.
--------------------------------------------------------------------------- */

export type NpCity = { ref: string; name: string; area: string; type: string };
export type NpWarehouse = { ref: string; name: string; number: string; maxWeightKg: number };

export type NovaPoshtaSelection = {
  cityRef: string;
  cityName: string;
  warehouseRef: string;
  warehouseName: string;
  costUah: number | null;
};

export default function NovaPoshtaPicker({
  locale,
  cart,
  value,
  onChange,
}: {
  locale: string;
  cart: CartLine[];
  value: NovaPoshtaSelection | null;
  onChange: (v: NovaPoshtaSelection | null) => void;
}) {
  const uk = locale === "uk";

  const [query, setQuery] = useState(value?.cityName ?? "");
  const [cities, setCities] = useState<NpCity[]>([]);
  const [openList, setOpenList] = useState(false);
  const [searching, setSearching] = useState(false);

  const [warehouses, setWarehouses] = useState<NpWarehouse[]>([]);
  const [loadingWh, setLoadingWh] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const boxRef = useRef<HTMLDivElement>(null);
  // Guards against a slow earlier response overwriting a newer one.
  const searchSeq = useRef(0);

  const L = {
    city: uk ? "Місто" : "City",
    cityHint: uk ? "Почніть вводити назву міста" : "Start typing a city name",
    warehouse: uk ? "Відділення Нової Пошти" : "Nova Poshta branch",
    chooseCityFirst: uk ? "Спершу оберіть місто" : "Choose a city first",
    loading: uk ? "Завантаження…" : "Loading…",
    noBranches: uk ? "Відділень не знайдено" : "No branches found",
    delivery: uk ? "Вартість доставки" : "Delivery cost",
    calculating: uk ? "Розраховуємо…" : "Calculating…",
    failed: uk ? "Не вдалося завантажити дані Нової Пошти." : "Couldn't load Nova Poshta data.",
    quoteFailed: uk
      ? "Не вдалося розрахувати доставку. Вартість повідомимо після оформлення."
      : "Couldn't calculate delivery. We'll confirm the cost after your order.",
    notConfigured: uk ? "Доставка тимчасово недоступна." : "Shipping lookup is temporarily unavailable.",
  };

  // Close the suggestion list on an outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpenList(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Debounced city search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || q === value?.cityName) {
      setCities([]);
      return;
    }
    const seq = ++searchSeq.current;
    const id = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const res = await fetch("/api/shipping/cities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
        const data = await res.json();
        if (seq !== searchSeq.current) return; // a newer search has started
        if (!data.ok) {
          setError(data.error === "not_configured" ? L.notConfigured : L.failed);
          setCities([]);
        } else {
          setCities(data.cities ?? []);
          setOpenList(true);
        }
      } catch {
        if (seq === searchSeq.current) setError(L.failed);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function pickCity(city: NpCity) {
    setQuery(city.name);
    setOpenList(false);
    setCities([]);
    setWarehouses([]);
    // City changed, so any previous branch and quote are void.
    onChange(null);
    setError(null);

    setLoadingWh(true);
    try {
      const res = await fetch("/api/shipping/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityRef: city.ref }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error === "not_configured" ? L.notConfigured : L.failed);
        return;
      }
      setWarehouses(data.warehouses ?? []);
      // Hold the city so a branch can be attached to it.
      onChange({ cityRef: city.ref, cityName: city.name, warehouseRef: "", warehouseName: "", costUah: null });
    } catch {
      setError(L.failed);
    } finally {
      setLoadingWh(false);
    }
  }

  async function pickWarehouse(ref: string) {
    if (!value) return;
    const wh = warehouses.find((w) => w.ref === ref);
    if (!wh) return;

    const next: NovaPoshtaSelection = {
      ...value,
      warehouseRef: wh.ref,
      warehouseName: wh.name,
      costUah: null,
    };
    onChange(next);

    setQuoting(true);
    setError(null);
    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cityRef: value.cityRef,
          lines: cart.map((l) => ({ slug: l.slug, qty: l.qty, options: l.options })),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        // A missing quote must not block checkout — the branch is still chosen
        // and the cost is confirmed at invoice time.
        setError(data.error === "not_configured" ? L.notConfigured : L.quoteFailed);
        return;
      }
      onChange({ ...next, costUah: Number(data.costUah) });
    } catch {
      setError(L.quoteFailed);
    } finally {
      setQuoting(false);
    }
  }

  const labelCls = "block text-[11px] tracking-[0.2em] uppercase mb-2";
  const labelSt = { color: "var(--text-faint)" };

  return (
    <div className="flex flex-col gap-4">
      {/* City */}
      <div ref={boxRef} className="relative">
        <label htmlFor="np-city" className={labelCls} style={labelSt}>{L.city}</label>
        <input
          id="np-city"
          className="field"
          autoComplete="off"
          placeholder={L.cityHint}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => cities.length > 0 && setOpenList(true)}
        />
        {searching && (
          <span className="absolute right-4 top-[42px] text-[12px]" style={{ color: "var(--text-faint)" }}>
            {L.loading}
          </span>
        )}

        {openList && cities.length > 0 && (
          <ul
            className="absolute z-20 left-0 right-0 mt-1 max-h-[260px] overflow-y-auto"
            style={{ background: "var(--field-bg)", border: "1px solid var(--border-strong)" }}
          >
            {cities.map((c) => (
              <li key={c.ref}>
                <button
                  type="button"
                  onClick={() => pickCity(c)}
                  className="w-full text-left px-4 py-3 text-[14px] transition-colors hover:bg-[color:var(--bg-soft)]"
                  style={{ color: "var(--text)" }}
                >
                  {c.name}
                  {c.area && (
                    <span className="text-[12px]" style={{ color: "var(--text-muted)" }}> · {c.area}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Warehouse */}
      <div>
        <label htmlFor="np-warehouse" className={labelCls} style={labelSt}>{L.warehouse}</label>
        <select
          id="np-warehouse"
          className="field appearance-none"
          disabled={!value?.cityRef || loadingWh}
          value={value?.warehouseRef ?? ""}
          onChange={(e) => pickWarehouse(e.target.value)}
        >
          <option value="" disabled>
            {!value?.cityRef ? L.chooseCityFirst : loadingWh ? L.loading : warehouses.length === 0 ? L.noBranches : "—"}
          </option>
          {warehouses.map((w) => (
            <option key={w.ref} value={w.ref}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* Quote */}
      {value?.warehouseRef && (
        <div className="flex items-center justify-between p-4" style={{ background: "var(--bg-soft)" }}>
          <span className="text-[14px]" style={{ color: "var(--text)" }}>{L.delivery}</span>
          <span className="text-[15px] font-medium" style={{ color: "var(--text)" }}>
            {quoting ? L.calculating : value.costUah !== null ? `₴${value.costUah.toLocaleString("uk-UA")}` : "—"}
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="text-[13px]" style={{ color: "#b42318" }}>{error}</p>
      )}
    </div>
  );
}
