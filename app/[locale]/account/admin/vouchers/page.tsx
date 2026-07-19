import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import { adminConfigured, isAdminEmail } from "@/lib/admin";
import { splitVouchers, VOUCHER_COLUMNS, type Voucher } from "@/lib/loyalty/vouchers";
import VoucherRedeemForm from "@/components/account/VoucherRedeemForm";
import { createAdminClient } from "@/lib/supabase/admin";

/* ---------------------------------------------------------------------------
   Admin: redeem a voucher.

   Guarded twice over. This page 404s for non-admins — notFound() rather than a
   "forbidden" page, so its existence isn't advertised to customers poking at
   URLs. The action it calls re-checks independently, because that's the real
   boundary; this check only keeps the UI honest.
--------------------------------------------------------------------------- */

export default async function AdminVouchersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user } = await requireUser(locale);
  if (!isAdminEmail(user.email)) notFound();

  const uk = locale === "uk";

  // Recently issued vouchers, so codes can be looked up rather than retyped.
  let recent: Voucher[] = [];
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("vouchers")
      .select(VOUCHER_COLUMNS)
      .order("issued_at", { ascending: false })
      .limit(20);
    recent = (data ?? []).map((v) => ({
      id: String(v.id),
      code: String(v.code),
      amount_eur: Number(v.amount_eur),
      min_order_eur: Number(v.min_order_eur),
      milestone_eur: Number(v.milestone_eur),
      issued_at: String(v.issued_at),
      expires_at: String(v.expires_at),
      used_at: v.used_at ? String(v.used_at) : null,
      used_order_id: v.used_order_id ? String(v.used_order_id) : null,
    }));
  } catch (e) {
    // A missing service-role key must not take the page down.
    console.error("[admin/vouchers] could not list vouchers:", e);
  }

  const { activeVouchers, usedVouchers } = splitVouchers(recent);

  return (
    <div>
      <h1 className="text-3xl font-semibold mb-2" style={{ color: "#111" }}>
        {uk ? "Погашення ваучерів" : "Redeem a voucher"}
      </h1>
      <p className="text-[15px] mb-8" style={{ color: "#707072" }}>
        {uk
          ? "Позначає ваучер як використаний. Дія безпечна для повторного виконання — перше погашення залишається."
          : "Marks a voucher as used. Safe to run twice — the first redemption stands."}
      </p>

      {!adminConfigured() && (
        <p className="mb-6 text-sm" style={{ color: "#b42318" }}>
          ADMIN_EMAILS is not set — redemption will be refused.
        </p>
      )}

      <VoucherRedeemForm locale={locale} />

      <div className="mt-12">
        <h2 className="text-lg font-semibold mb-3" style={{ color: "#111" }}>
          {uk ? `Активні (${activeVouchers.length})` : `Outstanding (${activeVouchers.length})`}
        </h2>
        {activeVouchers.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {uk ? "Немає непогашених ваучерів." : "No outstanding vouchers."}
          </p>
        ) : (
          <ul className="text-sm divide-y" style={{ borderColor: "var(--border)" }}>
            {activeVouchers.map((v) => (
              <li key={v.id} className="flex items-center justify-between py-2.5">
                <span className="font-mono tracking-wider" style={{ color: "#111" }}>{v.code}</span>
                <span style={{ color: "var(--text-muted)" }}>
                  €{v.amount_eur.toFixed(2)} · {uk ? "діє до" : "expires"}{" "}
                  {new Date(v.expires_at).toLocaleDateString(uk ? "uk-UA" : "en-GB")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {usedVouchers.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-3" style={{ color: "#111" }}>
            {uk ? `Погашені (${usedVouchers.length})` : `Redeemed (${usedVouchers.length})`}
          </h2>
          <ul className="text-sm divide-y" style={{ borderColor: "var(--border)" }}>
            {usedVouchers.map((v) => (
              <li key={v.id} className="flex items-center justify-between py-2.5" style={{ opacity: 0.65 }}>
                <span className="font-mono tracking-wider" style={{ color: "#111" }}>{v.code}</span>
                <span style={{ color: "var(--text-muted)" }}>
                  {v.used_at && new Date(v.used_at).toLocaleDateString(uk ? "uk-UA" : "en-GB")}
                  {v.used_order_id ? ` · ${v.used_order_id}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
