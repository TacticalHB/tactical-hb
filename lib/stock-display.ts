/* ---------------------------------------------------------------------------
   How a stock row should READ. Pure — no database, no server-only import — so
   it can be used from a client form as easily as from the page that renders
   the list. The queries live in lib/stock-admin.ts; this half is only meaning.

   Same split as orders-display.ts / orders-admin.ts.
--------------------------------------------------------------------------- */

export type StockKind = "product" | "part";
export type StockLevel = "critical" | "low" | "ok";

export type MovementReason = "order" | "batch" | "correction" | "write_off" | "return";

export type StockMovement = {
  id: string;
  delta: number;
  reason: MovementReason;
  orderId: string | null;
  note: string | null;
  createdBy: string;
  createdAt: string;
};

export type StockItem = {
  sku: string;
  kind: StockKind;
  productSlug: string | null;
  variant: string | null;
  nameEn: string;
  nameUk: string;
  onHand: number;
  reorderLevel: number;
  criticalLevel: number;
  leadTimeDays: number | null;
  active: boolean;
  /** Latest first, capped by the query — a scannable tail, not the full ledger. */
  movements: StockMovement[];
  /** Current unit cost in UAH, or null when none has been entered yet. */
  unitCostUah: number | null;
};

/**
 * Where a line sits against its thresholds.
 *
 * At-or-below, not below: someone who set "critical at 3" means three is
 * already trouble, not that trouble starts at two. Negative counts (a sale we
 * couldn't cover) fall through to critical, which is where they belong.
 */
export function stockLevel(item: Pick<StockItem, "onHand" | "criticalLevel" | "reorderLevel">): StockLevel {
  if (item.onHand <= item.criticalLevel) return "critical";
  if (item.onHand <= item.reorderLevel) return "low";
  return "ok";
}

export function levelLabel(level: StockLevel, uk: boolean): string {
  const en: Record<StockLevel, string> = { critical: "Critical", low: "Low", ok: "OK" };
  const ua: Record<StockLevel, string> = { critical: "Критично", low: "Мало", ok: "Норма" };
  return (uk ? ua : en)[level];
}

export function reasonLabel(reason: MovementReason, uk: boolean): string {
  const en: Record<MovementReason, string> = {
    order: "Order",
    batch: "Batch received",
    correction: "Correction",
    write_off: "Write-off",
    return: "Return",
  };
  const ua: Record<MovementReason, string> = {
    order: "Замовлення",
    batch: "Партія отримана",
    correction: "Коригування",
    write_off: "Списання",
    return: "Повернення",
  };
  return (uk ? ua : en)[reason];
}

export function itemName(item: Pick<StockItem, "nameEn" | "nameUk">, uk: boolean): string {
  return uk ? item.nameUk : item.nameEn;
}

/** Sort for the admin list: worst first, then by name. What needs doing, on top. */
export function byUrgency(a: StockItem, b: StockItem): number {
  const rank: Record<StockLevel, number> = { critical: 0, low: 1, ok: 2 };
  const d = rank[stockLevel(a)] - rank[stockLevel(b)];
  return d !== 0 ? d : a.sku.localeCompare(b.sku);
}

/** ₴1 234 — no decimals, because stock costs are never quoted in kopiyky. */
export function formatUah(n: number): string {
  return `₴${Math.round(n).toLocaleString("uk-UA")}`;
}
