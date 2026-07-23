"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CartLine } from "@/components/CartContext";

/* ---------------------------------------------------------------------------
   Nova Poshta delivery: branch pickup OR courier to the door.

   Both share the city search — the recipient city is what Nova Poshta prices
   on either way. Branch mode then picks a відділення; courier mode collects a
   street address. Every lookup goes through our own API routes so the Nova
   Poshta key stays on the server, and the quote shown here is for display —
   the amount charged is re-quoted server-side at invoice time.
--------------------------------------------------------------------------- */

export type NpCity = { ref: string; name: string; area: string; type: string };
export type NpWarehouse = { ref: string; name: string; number: string; maxWeightKg: number };
export type NpDeliveryType = "warehouse" | "courier";

export type NovaPoshtaSelection = {
  deliveryType: NpDeliveryType;
  cityRef: string;
  cityName: string;
  // Branch mode
  warehouseRef: string;
  warehouseName: string;
  // Courier mode
  street: string;
  building: string;
  apartment: string;
  notes: string;
  costUah: number | null;
};

/** A fresh selection for a chosen city, in the given mode. */
function forCity(city: NpCity, deliveryType: NpDeliveryType): NovaPoshtaSelection {
  return {
    deliveryType,
    cityRef: city.ref,
    cityName: city.name,
    warehouseRef: "",
    warehouseName: "",
    street: "",
    building: "",
    apartment: "",
    notes: "",
    costUah: null,
  };
}

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
  const deliveryType: NpDeliveryType = value?.deliveryType ?? "warehouse";
  const isCourier = deliveryType === "courier";

  const [query, setQuery] = useState(value?.cityName ?? "");
  const [cities, setCities] = useState<NpCity[]>([]);
  const [openList, setOpenList] = useState(false);
  const [searching, setSearching] = useState(false);

  const [warehouses, setWarehouses] = useState<NpWarehouse[]>([]);
  const [loadingWh, setLoadingWh] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [whQuery, setWhQuery] = useState("");
  const [whOpen, setWhOpen] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const whBoxRef = useRef<HTMLDivElement>(null);
  const searchSeq = useRef(0);
  const whSeq = useRef(0);
  const quoteSeq = useRef(0);
  const cartRef = useRef(cart);
  cartRef.current = cart;

  const shownWarehouses = warehouses;

  const L = {
    typeWarehouse: uk ? "Відділення" : "Branch pickup",
    typeCourier: uk ? "Кур'єр (адресна)" : "Courier to address",
    typeWarehouseNote: uk ? "Самовивіз із відділення Нової Пошти" : "Collect from a Nova Poshta branch",
    typeCourierNote: uk ? "Доставка кур'єром на вашу адресу" : "Delivered by courier to your door",
    city: uk ? "Місто" : "City",
    cityHint: uk ? "Почніть вводити назву міста" : "Start typing a city name",
    warehouse: uk ? "Відділення Нової Пошти" : "Nova Poshta branch",
    chooseCityFirst: uk ? "Спершу оберіть місто" : "Choose a city first",
    loading: uk ? "Завантаження…" : "Loading…",
    noMatch: uk ? "Нічого не знайдено" : "No matches",
    branchSearch: uk ? "Номер відділення або вулиця" : "Branch number or street",
    change: uk ? "Змінити" : "Change",
    street: uk ? "Вулиця" : "Street",
    building: uk ? "Будинок" : "Building / house no.",
    apartment: uk ? "Квартира (необов'язково)" : "Apartment (optional)",
    notes: uk ? "Додаткові примітки (необов'язково)" : "Additional notes (optional)",
    delivery: uk ? "Вартість доставки" : "Delivery cost",
    calculating: uk ? "Розраховуємо…" : "Calculating…",
    failed: uk ? "Не вдалося завантажити дані Нової Пошти." : "Couldn't load Nova Poshta data.",
    quoteFailed: uk
      ? "Не вдалося розрахувати доставку. Вартість повідомимо після оформлення."
      : "Couldn't calculate delivery. We'll confirm the cost after your order.",
    notConfigured: uk ? "Доставка тимчасово недоступна." : "Shipping lookup is temporarily unavailable.",
  };

  const patch = (p: Partial<NovaPoshtaSelection>) => {
    if (!value) return;
    onChange({ ...value, ...p });
  };

  // Close suggestion lists on an outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (boxRef.current && !boxRef.current.contains(t)) setOpenList(false);
      if (whBoxRef.current && !whBoxRef.current.contains(t)) setWhOpen(false);
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
        if (seq !== searchSeq.current) return;
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

  const loadWarehouses = useCallback(async (cityRef: string, q: string) => {
    const seq = ++whSeq.current;
    setLoadingWh(true);
    try {
      const res = await fetch("/api/shipping/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityRef, query: q }),
      });
      const data = await res.json();
      if (seq !== whSeq.current) return;
      if (!data.ok) {
        setError(data.error === "not_configured" ? L.notConfigured : L.failed);
        setWarehouses([]);
        return;
      }
      setWarehouses(data.warehouses ?? []);
    } catch {
      if (seq === whSeq.current) setError(L.failed);
    } finally {
      if (seq === whSeq.current) setLoadingWh(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Branch search — only in warehouse mode, once a city is chosen and no branch
  // is picked yet.
  useEffect(() => {
    if (isCourier) return;
    const cityRef = value?.cityRef;
    if (!cityRef || value?.warehouseRef) return;
    const id = setTimeout(() => void loadWarehouses(cityRef, whQuery), 250);
    return () => clearTimeout(id);
  }, [isCourier, whQuery, value?.cityRef, value?.warehouseRef, loadWarehouses]);

  /** Quote the delivery. cityRecipient is fixed; ServiceType follows the mode. */
  const quote = useCallback(async (cityRef: string, type: NpDeliveryType, apply: (cost: number | null) => void) => {
    const seq = ++quoteSeq.current;
    setQuoting(true);
    setError(null);
    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cityRef,
          deliveryType: type,
          lines: cartRef.current.map((l) => ({ slug: l.slug, qty: l.qty, options: l.options })),
        }),
      });
      const data = await res.json();
      if (seq !== quoteSeq.current) return;
      if (!data.ok) {
        setError(data.error === "not_configured" ? L.notConfigured : L.quoteFailed);
        apply(null);
        return;
      }
      apply(Number(data.costUah));
    } catch {
      if (seq === quoteSeq.current) { setError(L.quoteFailed); apply(null); }
    } finally {
      if (seq === quoteSeq.current) setQuoting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setType(type: NpDeliveryType) {
    if (type === deliveryType) return;
    setError(null);
    setWhQuery("");
    setWhOpen(false);
    setWarehouses([]);
    if (!value?.cityRef) {
      // No city yet — just remember the mode by seeding an empty selection.
      onChange({ ...forCity({ ref: value?.cityRef ?? "", name: value?.cityName ?? "", area: "", type: "" }, type) });
      return;
    }
    // Keep the city; reset the other mode's fields and re-quote for the new type.
    const base: NovaPoshtaSelection = {
      ...forCity({ ref: value.cityRef, name: value.cityName, area: "", type: "" }, type),
    };
    if (type === "courier") {
      onChange(base);
      void quote(value.cityRef, "courier", (cost) => onChange({ ...base, costUah: cost }));
    } else {
      onChange(base); // branch effect will load warehouses; quote happens on pick
    }
  }

  function pickCity(city: NpCity) {
    setQuery(city.name);
    setOpenList(false);
    setCities([]);
    setWarehouses([]);
    setWhQuery("");
    setWhOpen(false);
    setError(null);

    const base = forCity(city, deliveryType);
    onChange(base);
    // Courier price depends only on the city, so quote right away. Branch mode
    // waits for a branch to be chosen.
    if (deliveryType === "courier") {
      void quote(city.ref, "courier", (cost) => onChange({ ...base, costUah: cost }));
    }
  }

  async function pickWarehouse(ref: string) {
    if (!value) return;
    const wh = warehouses.find((w) => w.ref === ref);
    if (!wh) return;
    const next: NovaPoshtaSelection = { ...value, warehouseRef: wh.ref, warehouseName: wh.name, costUah: null };
    onChange(next);
    void quote(value.cityRef, "warehouse", (cost) => onChange({ ...next, costUah: cost }));
  }

  const labelCls = "block text-[11px] tracking-[0.2em] uppercase mb-2";
  const labelSt = { color: "var(--text-faint)" };
  const cityChosen = !!value?.cityRef;

  return (
    <div className="flex flex-col gap-4">
      {/* Delivery type — branch pickup vs courier */}
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={uk ? "Тип доставки" : "Delivery type"}>
        {([
          { id: "warehouse" as const, title: L.typeWarehouse, note: L.typeWarehouseNote },
          { id: "courier" as const, title: L.typeCourier, note: L.typeCourierNote },
        ]).map((o) => {
          const active = deliveryType === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setType(o.id)}
              className="flex flex-col items-start gap-1 p-4 text-left transition-colors"
              style={{
                border: active ? "1px solid var(--ink)" : "1px solid var(--border-strong)",
                background: "var(--field-bg)",
              }}
            >
              <span className="text-[14px]" style={{ color: "var(--text)", fontWeight: active ? 500 : 400 }}>{o.title}</span>
              <span className="text-[12px] leading-snug" style={{ color: "var(--text-muted)" }}>{o.note}</span>
            </button>
          );
        })}
      </div>

      {/* City — shared by both modes */}
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
          <span className="absolute right-4 top-[42px] text-[12px]" style={{ color: "var(--text-faint)" }}>{L.loading}</span>
        )}
        {openList && cities.length > 0 && (
          <ul className="absolute z-20 left-0 right-0 mt-1 max-h-[260px] overflow-y-auto"
            style={{ background: "var(--field-bg)", border: "1px solid var(--border-strong)" }}>
            {cities.map((c) => (
              <li key={c.ref}>
                <button type="button" onClick={() => pickCity(c)}
                  className="w-full text-left px-4 py-3 text-[14px] transition-colors hover:bg-[color:var(--bg-soft)]"
                  style={{ color: "var(--text)" }}>
                  {c.name}
                  {c.area && <span className="text-[12px]" style={{ color: "var(--text-muted)" }}> · {c.area}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Branch mode — searchable warehouse list */}
      {!isCourier && (
        <div ref={whBoxRef} className="relative">
          <label htmlFor="np-warehouse" className={labelCls} style={labelSt}>
            {L.warehouse}
            {warehouses.length > 0 && (
              <span className="ml-2 normal-case tracking-normal" style={{ color: "var(--text-muted)" }}>({warehouses.length})</span>
            )}
          </label>

          {value?.warehouseRef ? (
            <div className="flex items-start justify-between gap-4 p-4" style={{ border: "1px solid var(--border-strong)", background: "var(--field-bg)" }}>
              <span className="text-[14px] leading-snug" style={{ color: "var(--text)" }}>{value.warehouseName}</span>
              <button type="button"
                onClick={() => { patch({ warehouseRef: "", warehouseName: "", costUah: null }); setWhQuery(""); setWhOpen(true); }}
                className="text-[12px] underline underline-offset-4 shrink-0 transition-opacity hover:opacity-70"
                style={{ color: "var(--text-muted)" }}>
                {L.change}
              </button>
            </div>
          ) : (
            <input id="np-warehouse" className="field" autoComplete="off"
              disabled={!cityChosen || loadingWh}
              placeholder={!cityChosen ? L.chooseCityFirst : loadingWh ? L.loading : L.branchSearch}
              value={whQuery}
              onChange={(e) => { setWhQuery(e.target.value); setWhOpen(true); }}
              onFocus={() => setWhOpen(true)} />
          )}

          {whOpen && !value?.warehouseRef && warehouses.length > 0 && (
            <ul className="absolute z-20 left-0 right-0 mt-1 max-h-[300px] overflow-y-auto"
              style={{ background: "var(--field-bg)", border: "1px solid var(--border-strong)" }}>
              {shownWarehouses.length === 0 ? (
                <li className="px-4 py-3 text-[13px]" style={{ color: "var(--text-muted)" }}>{L.noMatch}</li>
              ) : (
                shownWarehouses.map((w) => (
                  <li key={w.ref}>
                    <button type="button" onClick={() => { pickWarehouse(w.ref); setWhOpen(false); }}
                      className="w-full text-left px-4 py-3 text-[13.5px] leading-snug transition-colors hover:bg-[color:var(--bg-soft)]"
                      style={{ color: "var(--text)" }}>
                      {w.name}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

      {/* Courier mode — address fields, shown once a city is chosen */}
      {isCourier && cityChosen && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="np-street" className={labelCls} style={labelSt}>{L.street}</label>
            <input id="np-street" className="field" autoComplete="address-line1"
              value={value?.street ?? ""} onChange={(e) => patch({ street: e.target.value })} />
          </div>
          <div>
            <label htmlFor="np-building" className={labelCls} style={labelSt}>{L.building}</label>
            <input id="np-building" className="field" autoComplete="off"
              value={value?.building ?? ""} onChange={(e) => patch({ building: e.target.value })} />
          </div>
          <div>
            <label htmlFor="np-apartment" className={labelCls} style={labelSt}>{L.apartment}</label>
            <input id="np-apartment" className="field" autoComplete="off"
              value={value?.apartment ?? ""} onChange={(e) => patch({ apartment: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="np-notes" className={labelCls} style={labelSt}>{L.notes}</label>
            <input id="np-notes" className="field" autoComplete="off"
              value={value?.notes ?? ""} onChange={(e) => patch({ notes: e.target.value })} />
          </div>
        </div>
      )}

      {/* Quote — shown once the destination is pinned down */}
      {((value?.warehouseRef) || (isCourier && cityChosen)) && (
        <div className="flex items-center justify-between p-4" style={{ background: "var(--bg-soft)" }}>
          <span className="text-[14px]" style={{ color: "var(--text)" }}>{L.delivery}</span>
          <span className="text-[15px] font-medium" style={{ color: "var(--text)" }}>
            {quoting ? L.calculating : value?.costUah != null ? `₴${value.costUah.toLocaleString("uk-UA")}` : "—"}
          </span>
        </div>
      )}

      {error && <p role="alert" className="text-[13px]" style={{ color: "#b42318" }}>{error}</p>}
    </div>
  );
}
