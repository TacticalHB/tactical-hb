import { requireAdminPage } from "@/lib/admin-guard";
import { fetchAdminOrders } from "@/lib/orders-admin";
import { needsDispatch } from "@/lib/orders-display";
import { fetchAllRequests } from "@/lib/wholesale-portal";
import { isOpenRequest } from "@/lib/wholesale-display";
import { fetchPartners } from "@/lib/partners-admin";
import { fetchStock } from "@/lib/stock-admin";
import { stockLevel } from "@/lib/stock-display";
import { fetchAgentRuns } from "@/lib/agent-runs";
import OverviewView from "@/components/admin/OverviewView";

/* ---------------------------------------------------------------------------
   Admin home: what needs doing, today.

   NEW ON 1 OCTOBER 2026, when the console went white and was cut back to its
   main sections. The ops map used to be the home page; it moved to
   /admin/ops (Advisors), and this took its place because the first screen of
   the day should answer one question — is anybody waiting on us — in numbers,
   each of which is a link to the place it is fixed.

   Four counts, then the two lists most often opened next. Nothing here writes
   anything, and every figure comes from the same read layer its section uses,
   so the number on this page and the number on that page cannot disagree.

   A COUNT THAT FAILED TO LOAD SAYS SO ("—"), rather than showing 0. Zero is a
   claim that nothing is waiting; a broken read is not entitled to make it.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin");

  const [orders, requests, partnersRead, stock, briefRuns] = await Promise.all([
    fetchAdminOrders(),
    fetchAllRequests(200),
    fetchPartners(),
    fetchStock(),
    fetchAgentRuns("weekly_brief", 1),
  ]);

  return (
    <OverviewView
      locale={locale}
      orders={orders}
      openRequests={requests?.filter((r) => isOpenRequest(r.status)) ?? null}
      toDispatch={orders?.filter(needsDispatch).length ?? null}
      toApprove={partnersRead?.partners.filter((x) => x.hasLogin && x.accountStatus === "pending").length ?? null}
      lowStock={stock?.filter((i) => stockLevel(i) !== "ok").length ?? null}
      latestBriefAt={briefRuns?.[0]?.createdAt ?? null}
    />
  );
}
