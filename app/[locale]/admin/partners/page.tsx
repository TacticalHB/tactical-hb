import { requireAdminPage } from "@/lib/admin-guard";
import { fetchPartners } from "@/lib/partners-admin";
import { byAttention, followUpDue } from "@/lib/partners-display";
import PartnerForm from "@/components/admin/PartnerForm";
import PartnerCard from "@/components/admin/PartnerCard";

/* ---------------------------------------------------------------------------
   Admin: the wholesale CRM.

   The list answers one question first: who needs a nudge? Due follow-ups sort
   to the top before any pipeline logic, because the plan's whole case for
   this module is partners going quiet without anyone noticing (§3.2).

   Everything else — status moves, order links — lives inside each card,
   behind explicit buttons. Phase C's follow-up agent will READ this data and
   draft emails for approval; nothing here sends anything, to anyone, ever.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export default async function AdminPartnersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/partners");

  const uk = locale === "uk";
  const today = new Date().toISOString().slice(0, 10);

  const read = await fetchPartners();
  const partners = read === null ? null : [...read.partners].sort(byAttention(today));
  const dueCount = (partners ?? []).filter((p) => followUpDue(p, today)).length;

  return (
    <div className="min-h-screen pt-10 pb-24" style={{ background: "#f7f6f4" }}>
      <div className="page-container">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-1" style={{ color: "#111" }}>
            {uk ? "Оптові партнери" : "Wholesale partners"}
          </h1>
          <p className="text-[14.5px]" style={{ color: dueCount > 0 ? "#96322c" : "#707072" }}>
            {partners === null
              ? uk
                ? "Не вдалося завантажити партнерів."
                : "Couldn't load partners."
              : dueCount > 0
                ? uk
                  ? `${dueCount} ${dueCount === 1 ? "нагадування потребує" : "нагадувань потребують"} уваги`
                  : `${dueCount} follow-up${dueCount === 1 ? "" : "s"} due`
                : uk
                  ? `${partners.length} у реєстрі`
                  : `${partners.length} on the register`}
          </p>
        </header>

        {partners === null && (
          <div
            className="rounded-lg px-5 py-4 mb-6 text-[14px]"
            style={{ border: "1px solid #e6d4d2", background: "#fdf6f5", color: "#96322c" }}
          >
            {uk
              ? "Перевірте, чи виконано міграцію 0017_wholesale.sql у Supabase."
              : "Check that migration 0017_wholesale.sql has been run in Supabase."}
          </div>
        )}

        <div className="mb-8">
          <PartnerForm today={today} uk={uk} />
        </div>

        {partners !== null && partners.length === 0 && (
          <p className="text-[14.5px]" style={{ color: "#707072" }}>
            {uk
              ? "Реєстр порожній. Додайте першого партнера вище."
              : "The register is empty. Add the first partner above."}
          </p>
        )}

        {partners !== null && partners.length > 0 && (
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--border)", background: "#fff" }}
          >
            {partners.map((p) => (
              <PartnerCard
                key={p.id}
                partner={p}
                orders={read!.ordersByPartner[p.id] ?? []}
                today={today}
                uk={uk}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
