import "server-only";

/* ---------------------------------------------------------------------------
   Nova Poshta API.

   NOVA_POSHTA_API_KEY is read here and nowhere else — every function in this
   file runs server-side, so the key never reaches the browser.

   One endpoint does everything: POST /v2.0/json/ with a modelName and a
   calledMethod. Errors come back as HTTP 200 with success:false, so the status
   code alone tells you nothing; `call()` normalises that into a thrown error.
--------------------------------------------------------------------------- */

const ENDPOINT = "https://api.novaposhta.ua/v2.0/json/";

/** Parcel weight in kg until real product weights exist. */
export const DEFAULT_WEIGHT_KG = 1;

/** Where parcels are dispatched from. Overridable without a code change. */
const SENDER_CITY = process.env.NOVA_POSHTA_SENDER_CITY || "Харків";

export class NovaPoshtaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NovaPoshtaError";
  }
}

function apiKey(): string {
  const k = process.env.NOVA_POSHTA_API_KEY;
  if (!k) throw new NovaPoshtaError("NOVA_POSHTA_API_KEY is not set");
  return k;
}

async function call<T>(modelName: string, calledMethod: string, methodProperties: Record<string, unknown>): Promise<T[]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: apiKey(), modelName, calledMethod, methodProperties }),
    cache: "no-store",
  });

  if (!res.ok) throw new NovaPoshtaError(`${calledMethod} HTTP ${res.status}`);

  const json = (await res.json()) as { success?: boolean; data?: T[]; errors?: string[] };
  // Nova Poshta answers 200 even for failures — success is the only signal.
  if (!json.success) {
    const why = (json.errors ?? []).join("; ") || "unknown error";
    throw new NovaPoshtaError(`${calledMethod}: ${why}`);
  }
  return json.data ?? [];
}

/* ---- Cities --------------------------------------------------------------- */

export type NpCity = { ref: string; name: string; area: string; type: string };

type RawCity = {
  Ref: string;
  Description: string;
  AreaDescription?: string;
  SettlementTypeDescription?: string;
};

export async function searchCities(query: string, limit = 20): Promise<NpCity[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const rows = await call<RawCity>("Address", "getCities", {
    FindByString: trimmed,
    Limit: String(limit),
  });

  return rows.map((c) => ({
    ref: c.Ref,
    name: c.Description,
    area: c.AreaDescription ?? "",
    type: c.SettlementTypeDescription ?? "",
  }));
}

/* ---- Warehouses ----------------------------------------------------------- */

export type NpWarehouse = { ref: string; name: string; number: string; maxWeightKg: number };

type RawWarehouse = {
  Ref: string;
  Description: string;
  Number: string;
  TotalMaxWeightAllowed?: string;
};

export async function getWarehouses(cityRef: string): Promise<NpWarehouse[]> {
  if (!cityRef) return [];
  const rows = await call<RawWarehouse>("Address", "getWarehouses", {
    CityRef: cityRef,
    Limit: "500",
    Page: "1",
  });

  return rows
    .map((w) => ({
      ref: w.Ref,
      name: w.Description,
      number: w.Number,
      maxWeightKg: Number(w.TotalMaxWeightAllowed) || 0,
    }))
    // "№12" sorts after "№9" as text; order by the branch number instead.
    .sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
}

/* ---- Sender city ---------------------------------------------------------- */

let senderRefCache: string | null = null;

/**
 * The dispatch city's reference, resolved from the API rather than hardcoded
 * so it cannot silently go stale. Cached for the life of the instance.
 */
export async function getSenderCityRef(): Promise<string> {
  if (senderRefCache) return senderRefCache;

  const cities = await searchCities(SENDER_CITY, 10);
  // A search for "Харків" also matches villages named after it; prefer the
  // exact name, and a city over a settlement.
  const exact =
    cities.find((c) => c.name === SENDER_CITY && c.type === "місто") ??
    cities.find((c) => c.name === SENDER_CITY) ??
    cities[0];

  if (!exact) throw new NovaPoshtaError(`Could not resolve sender city "${SENDER_CITY}"`);
  senderRefCache = exact.ref;
  return exact.ref;
}

/* ---- Price ---------------------------------------------------------------- */

type RawPrice = { Cost?: number | string };

/**
 * Delivery price in whole hryvnia, warehouse → warehouse.
 *
 * `declaredValueUah` is the parcel's declared value, which Nova Poshta uses for
 * insurance — passing the basket total keeps the customer covered for what they
 * actually bought.
 */
export async function getDeliveryPrice(opts: {
  cityRecipientRef: string;
  declaredValueUah: number;
  weightKg?: number;
}): Promise<number> {
  const senderRef = await getSenderCityRef();

  const rows = await call<RawPrice>("InternetDocument", "getDocumentPrice", {
    CitySender: senderRef,
    CityRecipient: opts.cityRecipientRef,
    Weight: String(opts.weightKg ?? DEFAULT_WEIGHT_KG),
    ServiceType: "WarehouseWarehouse",
    Cost: String(Math.max(1, Math.round(opts.declaredValueUah))),
    CargoType: "Cargo",
    SeatsAmount: "1",
  });

  const cost = Number(rows[0]?.Cost);
  if (!Number.isFinite(cost) || cost < 0) {
    throw new NovaPoshtaError("getDocumentPrice returned no usable cost");
  }
  return Math.round(cost);
}
