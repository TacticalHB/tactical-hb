import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-guard";
import { fetchAllRequests } from "@/lib/wholesale-portal";
import { isOpenRequest } from "@/lib/wholesale-display";
import WholesaleRequestCard from "@/components/admin/WholesaleRequestCard";

/* ---------------------------------------------------------------------------
   Admin: the wholesale request inbox.

   EVERY SUBMISSION IS HERE, whether or not its email arrived. That is the
   whole point of the table: the alert to sales is best-effort and an inbox
   filter or a Resend outage must not be able to lose an order. If a partner
   says they sent one, this page is the answer.

   Nothing on this page charges anything. A request becomes revenue when a
   human quotes it, emails a payment link and marks it paid — the status
   select is that workflow, and it is the only mutation here.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export default async function AdminWholesalePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/wholesale");

  const uk = locale === "uk";
  const requests = await fetchAllRequests();
  const open = (requests ?? []).filter((r) => isOpenRequest(r.status)).length;

  return (
    <div className="min-h-screen pt-10 pb-24" style={{ background: "var(--console-bg-2)" }}>
      <div className="page-container">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-1" style={{ color: "var(--console-text)" }}>
            {uk ? "Оптові запити" : "Wholesale requests"}
          </h1>
          <p
            className="text-[14.5px]"
            style={{ color: open > 0 ? "var(--console-alert)" : "var(--console-muted)" }}
          >
            {requests === null
              ? uk
                ? "Не вдалося завантажити запити."
                : "Couldn't load requests."
              : open > 0
                ? uk
                  ? `${open} у роботі`
                  : `${open} awaiting action`
                : uk
                  ? `${requests.length} усього`
                  : `${requests.length} in total`}
          </p>
          <p className="text-[13px] mt-2" style={{ color: "var(--console-faint)" }}>
            {uk
              ? "Оплату надсилаєте вручну — на сайті партнери не платять."
              : "Payment links go out by hand — partners never pay on the site."}
            {" · "}
            <Link
              href={`/${locale}/admin/partners`}
              className="underline underline-offset-2"
              style={{ color: "var(--console-muted)" }}
            >
              {uk ? "Схвалення партнерів" : "Approve partners"}
            </Link>
          </p>
        </header>

        <div
          className="rounded"
          style={{ background: "var(--console-panel)", border: "1px solid var(--console-border)" }}
        >
          {requests === null || requests.length === 0 ? (
            <p className="px-5 py-8 text-[13.5px]" style={{ color: "var(--console-faint)" }}>
              {uk ? "Запитів поки що немає." : "No requests yet."}
            </p>
          ) : (
            requests.map((r) => <WholesaleRequestCard key={r.id} request={r} uk={uk} />)
          )}
        </div>
      </div>
    </div>
  );
}
