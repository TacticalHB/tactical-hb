import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-guard";
import { fetchPartners } from "@/lib/partners-admin";
import { quietPartners, QUIET_DAYS } from "@/lib/followup-display";
import { kyivDate } from "@/lib/advisor-admin";
import FollowUpCard from "@/components/admin/FollowUpCard";

/* ---------------------------------------------------------------------------
   Admin: the Wholesale Follow-up Agent — who has gone quiet, and a letter
   for each of them.

   DRAFTS ONLY, NOTHING SENDS. That is the founder's Phase C rule, and it is
   enforced structurally: there is no send path in this agent, in either
   half, on this page or behind it. Drafts leave through the clipboard or a
   mailto: link into the founder's own mail client. The record of relations
   stays in /admin/partners — this page never changes a status, a note or a
   follow-up date.

   Quiet means: a live relationship (active or dormant) whose last countable
   order is 90+ days behind us. Leads that never ordered belong to the CRM's
   own next_follow_up discipline, not to this list.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export default async function AdminFollowUpsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/followups");

  const uk = locale === "uk";
  const read = await fetchPartners();
  const candidates = read === null ? null : quietPartners(read.partners, kyivDate(0));

  return (
    <div className="min-h-screen pt-10 pb-24" style={{ background: "var(--console-bg-2)" }}>
      <div className="page-container">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-1" style={{ color: "var(--console-text)" }}>
            {uk ? "Листи партнерам" : "Follow-up drafts"}
          </h1>
          <p className="text-[14.5px]" style={{ color: "var(--console-muted)" }}>
            {candidates === null
              ? uk
                ? "Не вдалося завантажити партнерів."
                : "Couldn't load partners."
              : candidates.length === 0
                ? uk
                  ? `Ніхто не мовчить довше ${QUIET_DAYS} днів.`
                  : `Nobody has been quiet longer than ${QUIET_DAYS} days.`
                : uk
                  ? `${candidates.length} ${candidates.length === 1 ? "партнер мовчить" : "партнерів мовчать"} понад ${QUIET_DAYS} днів`
                  : `${candidates.length} partner${candidates.length === 1 ? "" : "s"} quiet for ${QUIET_DAYS}+ days`}
          </p>
          <p className="text-[13px] mt-2" style={{ color: "var(--console-muted)" }}>
            {uk
              ? "Система нічого не надсилає: чернетку копіюєте у свою пошту, редагуєте і вирішуєте самі. Статуси та дати — у "
              : "The system sends nothing: copy a draft into your own mail, edit it, and decide. Statuses and dates live in "}
            <Link href={`/${locale}/admin/partners`} className="underline underline-offset-2">
              {uk ? "Партнерах" : "Partners"}
            </Link>
            .
          </p>
        </header>

        {candidates === null && (
          <div
            className="rounded-lg px-5 py-4 text-[14px]"
            style={{ border: "1px solid rgba(196,92,92,0.35)", background: "var(--console-alert-soft)", color: "var(--console-alert)" }}
          >
            {uk
              ? "Перевірте, чи виконано міграцію 0017_wholesale.sql у Supabase, та чи задано SUPABASE_SERVICE_ROLE_KEY."
              : "Check that migration 0017_wholesale.sql has been run in Supabase, and that SUPABASE_SERVICE_ROLE_KEY is set."}
          </div>
        )}

        {candidates !== null && candidates.length > 0 && (
          <div className="flex flex-col gap-3">
            {candidates.map((c) => (
              <FollowUpCard key={c.partner.id} candidate={c} uk={uk} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
