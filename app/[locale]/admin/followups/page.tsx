import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-guard";
import { fetchPartners } from "@/lib/partners-admin";
import { fetchPartnerMessages } from "@/lib/followup-admin";
import { quietPartners, QUIET_DAYS, SEND_COOLDOWN_DAYS } from "@/lib/followup-display";
import { kyivDate } from "@/lib/advisor-admin";
import FollowUpCard from "@/components/admin/FollowUpCard";

/* ---------------------------------------------------------------------------
   Admin: the Wholesale Follow-up Agent — who has gone quiet, a letter for
   each of them, and (Phase F) a way to send it.

   THE SEND GATE. Phase C's rule was "drafts only", enforced by there being no
   send path at all. Phase F adds one, and it is narrow on purpose: one
   partner at a time, the letter shown in full and editable, and a second
   confirmation against the actual address before anything leaves. No bulk
   send exists, and no cron path can reach a partner's inbox — the Monday job
   still only writes to the founder. Every attempt is recorded in
   partner_messages (0023), and a delivered letter shuts that partner's button
   for SEND_COOLDOWN_DAYS.

   The clipboard and mailto: exits remain, and are the only route when the
   cooldown is shut or a partner has no email on file.

   The record of the RELATIONSHIP still lives in /admin/partners — this page
   never changes a status, a note or a follow-up date, because sending a
   letter is not the same as deciding what the relationship now is.

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
  const [read, messages] = await Promise.all([fetchPartners(), fetchPartnerMessages()]);
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
              ? `Нічого не йде саме: ви читаєте лист, редагуєте його і підтверджуєте адресу. Після надсилання кнопка для цього партнера закривається на ${SEND_COOLDOWN_DAYS} днів. Статуси та дати — у `
              : `Nothing goes by itself: you read the letter, edit it, and confirm the address. After a send, that partner's button shuts for ${SEND_COOLDOWN_DAYS} days. Statuses and dates live in `}
            <Link href={`/${locale}/admin/partners`} className="underline underline-offset-2">
              {uk ? "Партнерах" : "Partners"}
            </Link>
            .
          </p>
          {messages === null && (
            <p className="text-[13px] mt-2" style={{ color: "var(--console-warn)" }}>
              {uk
                ? "Історію листів не прочитано — надсилання вимкнено, доки вона не стане доступною (міграція 0023)."
                : "The send history is unreadable — sending stays off until it can be read (migration 0023)."}
            </p>
          )}
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
              <FollowUpCard
                key={c.partner.id}
                candidate={c}
                // null means the history read failed, which the card treats as
                // "no sending" rather than "no history" — an unknown cooldown
                // must never resolve to permission.
                messages={messages === null ? null : (messages[c.partner.id] ?? [])}
                uk={uk}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
