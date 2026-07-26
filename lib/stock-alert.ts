import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL } from "@/lib/contact-info";
import { esc, sendMail } from "@/lib/email";
import { stockLevel, type StockLevel } from "@/lib/stock-display";

/* ---------------------------------------------------------------------------
   The daily low-stock warning.

   WHY IT RIDES ON THE TRACKING CRON rather than having its own schedule: the
   Vercel Hobby plan allows one cron run a day, and /api/cron/track-orders owns
   that slot. A second entry in vercel.json would simply not run, which is the
   worst kind of failure — a feature that looks configured and is silent. So
   this runs immediately after tracking, on the same authorised request.

   IT EMAILS ON CHANGE, NOT ON STATE. An item that is Critical today and still
   Critical tomorrow is not news; a daily repeat trains you to ignore the whole
   channel, and then the one that matters goes unread too. So a line is
   reported when it gets WORSE than last time it was reported, or when it has
   sat at the same bad level for a week. Recovering to OK clears the flag
   silently, so the next slip is news again.

   Internal mail to the shop's own address — no customer or partner is ever
   contacted from here, and nothing is sent that needs approving.
--------------------------------------------------------------------------- */

export type StockAlertResult = {
  scanned: number;
  reported: number;
  emailed: boolean;
  errors: number;
};

/** How long a line may sit at the same bad level before it is raised again. */
const RENAG_DAYS = 7;

type Row = {
  sku: string;
  name_en: string;
  name_uk: string;
  on_hand: number;
  reorder_level: number;
  critical_level: number;
  alert_level: string | null;
  alerted_at: string | null;
};

/** Critical is worse than low; anything is worse than never having reported. */
function worsened(now: StockLevel, before: string | null): boolean {
  if (now === "ok") return false;
  if (before === null) return true;
  return now === "critical" && before === "low";
}

function stale(alertedAt: string | null): boolean {
  if (!alertedAt) return true;
  const then = new Date(alertedAt).getTime();
  if (Number.isNaN(then)) return true;
  return Date.now() - then >= RENAG_DAYS * 24 * 60 * 60 * 1000;
}

export async function runStockAlert(): Promise<StockAlertResult> {
  const out: StockAlertResult = { scanned: 0, reported: 0, emailed: false, errors: 0 };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("[stock-alert] no admin client:", e instanceof Error ? e.message : e);
    out.errors += 1;
    return out;
  }

  const { data, error } = await admin
    .from("stock_items")
    .select("sku, name_en, name_uk, on_hand, reorder_level, critical_level, alert_level, alerted_at")
    .eq("active", true);

  if (error) {
    // A missing table means migration 0015 hasn't been run yet. Report it and
    // return — this must never take the tracking run down with it.
    console.error("[stock-alert] could not read stock:", error.code, error.message);
    out.errors += 1;
    return out;
  }

  const rows = (data ?? []) as Row[];
  out.scanned = rows.length;

  const toReport: { row: Row; level: StockLevel }[] = [];
  const toClear: string[] = [];

  for (const row of rows) {
    const level = stockLevel({
      onHand: row.on_hand,
      criticalLevel: row.critical_level,
      reorderLevel: row.reorder_level,
    });

    if (level === "ok") {
      // Back in stock: forget it happened, so the next slip is news again.
      if (row.alert_level !== null) toClear.push(row.sku);
      continue;
    }

    if (worsened(level, row.alert_level) || stale(row.alerted_at)) {
      toReport.push({ row, level });
    }
  }

  if (toClear.length) {
    const { error: clearErr } = await admin
      .from("stock_items")
      .update({ alert_level: null, alerted_at: null })
      .in("sku", toClear);
    if (clearErr) {
      console.error("[stock-alert] could not clear flags:", clearErr.message);
      out.errors += 1;
    }
  }

  if (toReport.length === 0) return out;
  out.reported = toReport.length;

  // Worst first, so the subject line and the top of the mail agree about what
  // matters. Ties broken by how deep the hole is.
  toReport.sort((a, b) => {
    if (a.level !== b.level) return a.level === "critical" ? -1 : 1;
    return a.row.on_hand - b.row.on_hand;
  });

  const criticalCount = toReport.filter((t) => t.level === "critical").length;
  const sent = await sendAlertMail(toReport, criticalCount);
  out.emailed = sent;
  if (!sent) out.errors += 1;

  // Only claim the alert once the mail is away. Recording it first would mean a
  // Resend outage silently swallowed the warning until the level worsened
  // again — the opposite of what an alert is for.
  if (sent) {
    for (const { row, level } of toReport) {
      const { error: markErr } = await admin
        .from("stock_items")
        .update({ alert_level: level, alerted_at: new Date().toISOString() })
        .eq("sku", row.sku);
      if (markErr) {
        console.error("[stock-alert] could not mark", row.sku, markErr.message);
        out.errors += 1;
      }
    }
  }

  return out;
}

async function sendAlertMail(
  items: { row: Row; level: StockLevel }[],
  criticalCount: number
): Promise<boolean> {
  const subject =
    criticalCount > 0
      ? `STOCK — ${criticalCount} critical, ${items.length} to review — Tactical HB`
      : `STOCK — ${items.length} running low — Tactical HB`;

  const line = (t: { row: Row; level: StockLevel }) =>
    `${t.level === "critical" ? "CRITICAL" : "low"}  ${t.row.name_en} — ${t.row.on_hand} left (low at ${t.row.reorder_level}, critical at ${t.row.critical_level})`;

  const rowsHtmlOut = items
    .map(
      (t) => `
      <tr>
        <td style="padding:8px 12px 8px 0;vertical-align:top">
          <strong>${esc(t.row.name_en)}</strong><br>
          <span style="color:#707072;font-size:13px">${esc(t.row.sku)}</span>
        </td>
        <td style="padding:8px 12px;vertical-align:top;white-space:nowrap;color:${
          t.level === "critical" ? "#96322c" : "#8a5d16"
        }">${t.level === "critical" ? "CRITICAL" : "LOW"}</td>
        <td style="padding:8px 0;vertical-align:top;text-align:right;white-space:nowrap">
          <strong>${t.row.on_hand}</strong>
          <span style="color:#707072;font-size:13px"> / ${t.row.reorder_level}</span>
        </td>
      </tr>`
    )
    .join("");

  const siteUrl = (process.env.SITE_URL || "https://tactical-hb.com").replace(/\/$/, "");

  const result = await sendMail({
    to: ADMIN_EMAIL,
    subject,
    text: [
      "Stock needing attention:",
      "",
      ...items.map(line),
      "",
      `${siteUrl}/uk/admin/stock`,
    ].join("\n"),
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#111">
        <p style="margin:0 0 16px"><strong>Stock needing attention</strong></p>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;margin:0 0 20px">${rowsHtmlOut}</table>
        <p style="margin:0"><a href="${siteUrl}/uk/admin/stock" style="color:#111">Open stock</a></p>
      </div>
    `,
  });

  if (!result.ok) {
    console.error("[stock-alert] email not sent:", result.error);
    return false;
  }
  return true;
}
