import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { buildCsv } from "@/lib/finance-display";
import { fetchCostsForExport, fetchOrdersForExport } from "@/lib/finance-admin";

/* ---------------------------------------------------------------------------
   The accountant's exports: GET ?kind=orders | costs.

   Guarded like every admin surface, and 404 on every refusal — a stranger
   probing /api/admin/* learns nothing, not even that the route exists. Same
   choice requireAdminPage makes for the pages.

   Column headers are English on purpose: they are field names for a
   spreadsheet, not UI copy, and a stable vocabulary survives being mailed to
   an accountant, imported, and mailed back. Amounts are bare numbers; dates
   are ISO. Formatting is the spreadsheet's job.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!isAdminEmail(user?.email)) return new Response(null, { status: 404 });

  const kind = new URL(request.url).searchParams.get("kind");
  const today = new Date().toISOString().slice(0, 10);

  let csv: string | null = null;
  let name = "";

  if (kind === "orders") {
    const rows = await fetchOrdersForExport();
    if (rows !== null) {
      name = `tactical-hb-orders-${today}.csv`;
      csv = buildCsv(
        [
          "date", "reference", "status", "email",
          "amount_uah", "amount_eur", "shipping_uah", "discount_eur",
          "voucher", "wholesale_partner",
        ],
        rows.map((r) => [
          r.createdAt.slice(0, 10),
          r.reference,
          r.status,
          r.email,
          r.amountUah,
          r.amountEur,
          r.shippingUah,
          r.discountEur,
          r.voucherCode,
          r.partnerCompany,
        ])
      );
    }
  } else if (kind === "costs") {
    const rows = await fetchCostsForExport();
    if (rows !== null) {
      name = `tactical-hb-costs-${today}.csv`;
      csv = buildCsv(
        ["date", "category", "amount_uah", "amount_eur", "period", "supplier", "sku", "note"],
        rows.map((r) => [
          r.incurredOn,
          r.category,
          r.amountUah,
          r.amountEur,
          r.period,
          r.supplier,
          r.sku,
          r.note,
        ])
      );
    }
  } else {
    // An unknown kind is a caller error worth telling an admin about —
    // they are past the guard, so a hint costs nothing.
    return new Response("kind must be orders or costs", { status: 400 });
  }

  if (csv === null) {
    return new Response("export failed — check the server logs", { status: 500 });
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
