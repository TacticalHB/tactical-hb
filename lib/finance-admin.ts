import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChannelMonth, CostMonth, FinanceMonth, ProductMonth } from "@/lib/finance-display";

/* ---------------------------------------------------------------------------
   Reading the finance views (0018) for /admin/finance.

   Service-role for the same reason as every admin module: the views are
   revoked from the browser keys outright, so nothing else can read them.
   Authorisation is the caller's job.

   All of this is READ. Finance computes; it never writes — there is no
   mutation in this file by design, and none should ever move in.
--------------------------------------------------------------------------- */

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** The monthly picture, newest first. */
export async function fetchFinanceMonths(limit = 12): Promise<FinanceMonth[] | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("finance_monthly")
      .select("*")
      .order("month", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[admin/finance] monthly read failed:", error.code, error.message);
      return null;
    }

    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        month: String(row.month),
        ordersCount: num(row.orders_count) ?? 0,
        revenueUah: num(row.revenue_uah),
        unpricedOrders: num(row.unpriced_orders) ?? 0,
        cogsUah: num(row.cogs_uah),
        uncostedLines: num(row.uncosted_lines) ?? 0,
        opexUah: num(row.opex_uah),
        marginUah: num(row.margin_uah) ?? 0,
        shippingChargedUah: num(row.shipping_charged_uah) ?? 0,
      };
    });
  } catch (e) {
    console.error("[admin/finance] monthly read threw:", e);
    return null;
  }
}

/**
 * Retail against wholesale for one month (0022 §9).
 *
 * Read rather than assembled from orders in TypeScript: the view applies the
 * same status allowlist and the same Kyiv-month boundary as finance_monthly,
 * and two revenue figures that disagree are worse than one that is late.
 */
export async function fetchChannelMonth(month: string): Promise<ChannelMonth[] | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("finance_channel_monthly")
      .select("*")
      .eq("month", month)
      .order("channel", { ascending: true });

    if (error) {
      console.error("[admin/finance] channel read failed:", error.code, error.message);
      return null;
    }

    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        month: String(row.month),
        channel: row.channel === "wholesale" ? ("wholesale" as const) : ("retail" as const),
        ordersCount: num(row.orders_count) ?? 0,
        revenueUah: num(row.revenue_uah),
        unpricedOrders: num(row.unpriced_orders) ?? 0,
        shippingChargedUah: num(row.shipping_charged_uah) ?? 0,
        units: num(row.units) ?? 0,
        lineRevenueUah: num(row.line_revenue_uah),
        cogsUah: num(row.cogs_uah),
        uncostedLines: num(row.uncosted_lines) ?? 0,
        grossMarginUah: num(row.gross_margin_uah),
      };
    });
  } catch (e) {
    console.error("[admin/finance] channel read threw:", e);
    return null;
  }
}

/** Operating costs by category for one month. */
export async function fetchCostBreakdown(month: string): Promise<CostMonth[] | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("cost_entries_monthly")
      .select("*")
      .eq("month", month)
      .order("total_uah", { ascending: false });

    if (error) {
      console.error("[admin/finance] cost breakdown failed:", error.code, error.message);
      return null;
    }

    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        month: String(row.month),
        category: String(row.category),
        totalUah: num(row.total_uah) ?? 0,
        entries: num(row.entries) ?? 0,
      };
    });
  } catch (e) {
    console.error("[admin/finance] cost breakdown threw:", e);
    return null;
  }
}

/** What each product did in one month, best sellers first. */
export async function fetchProductMonth(month: string): Promise<ProductMonth[] | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("finance_products_monthly")
      .select("*")
      .eq("month", month)
      .order("revenue_uah", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("[admin/finance] product read failed:", error.code, error.message);
      return null;
    }

    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        month: String(row.month),
        sku: String(row.sku),
        productName: String(row.product_name ?? row.sku),
        units: num(row.units) ?? 0,
        revenueUah: num(row.revenue_uah),
        cogsUah: num(row.cogs_uah),
        uncostedLines: num(row.uncosted_lines) ?? 0,
        unpricedLines: num(row.unpriced_lines) ?? 0,
      };
    });
  } catch (e) {
    console.error("[admin/finance] product read threw:", e);
    return null;
  }
}

/* ---------------------------------------------------------------------------
   Rows for the accountant's CSV exports (built in the route handler with
   lib/finance-display.buildCsv). Full dumps, oldest first — the accountant
   filters in the spreadsheet; we do not guess which slice they need.
--------------------------------------------------------------------------- */

export type OrderExportRow = {
  createdAt: string;
  reference: string;
  status: string;
  email: string | null;
  amountUah: number | null;
  amountEur: number | null;
  shippingUah: number | null;
  discountEur: number | null;
  voucherCode: string | null;
  partnerCompany: string | null;
};

export async function fetchOrdersForExport(): Promise<OrderExportRow[] | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("orders")
      .select(
        `id, created_at, external_ref, status, email,
         amount_uah, amount_eur, shipping_uah, discount_eur, voucher_code,
         wholesale_partners ( company )`
      )
      .order("created_at", { ascending: true })
      .limit(5000);

    if (error) {
      console.error("[admin/finance] orders export failed:", error.code, error.message);
      return null;
    }

    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const partner = row.wholesale_partners as { company?: unknown } | null;
      return {
        createdAt: String(row.created_at),
        reference: String(row.external_ref ?? String(row.id).slice(0, 8)),
        status: String(row.status ?? ""),
        email: (row.email as string | null) ?? null,
        amountUah: num(row.amount_uah),
        amountEur: num(row.amount_eur),
        shippingUah: num(row.shipping_uah),
        discountEur: num(row.discount_eur),
        voucherCode: (row.voucher_code as string | null) ?? null,
        partnerCompany: partner?.company ? String(partner.company) : null,
      };
    });
  } catch (e) {
    console.error("[admin/finance] orders export threw:", e);
    return null;
  }
}

export type CostExportRow = {
  incurredOn: string;
  category: string;
  amountUah: number;
  amountEur: number | null;
  period: string | null;
  supplier: string | null;
  sku: string | null;
  note: string | null;
};

export async function fetchCostsForExport(): Promise<CostExportRow[] | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("cost_entries")
      .select("incurred_on, category, amount_uah, amount_eur, period, supplier, sku, note")
      .order("incurred_on", { ascending: true })
      .limit(5000);

    if (error) {
      console.error("[admin/finance] costs export failed:", error.code, error.message);
      return null;
    }

    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        incurredOn: String(row.incurred_on),
        category: String(row.category),
        amountUah: num(row.amount_uah) ?? 0,
        amountEur: num(row.amount_eur),
        period: (row.period as string | null) ?? null,
        supplier: (row.supplier as string | null) ?? null,
        sku: (row.sku as string | null) ?? null,
        note: (row.note as string | null) ?? null,
      };
    });
  } catch (e) {
    console.error("[admin/finance] costs export threw:", e);
    return null;
  }
}
