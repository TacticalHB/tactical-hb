import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-guard";
import { fetchStock } from "@/lib/stock-admin";
import { formatUah, stockLevel } from "@/lib/stock-display";
import { fetchFinanceMonths } from "@/lib/finance-admin";
import { fetchPartners } from "@/lib/partners-admin";
import { followUpDue } from "@/lib/partners-display";
import { currentPeriod } from "@/lib/costs-display";

/* ---------------------------------------------------------------------------
   Admin home.

   Five links and three numbers, and that is the whole ambition for now. The
   department map belongs to Phase E of the OS plan, and building it before the
   modules exist would produce an impressive menu of empty rooms — the plan is
   explicit that data comes first and the pyramid last.

   The numbers it does show are the ones the founder opens this page to check:
   stock lines needing attention, this month's margin, follow-ups due. That is
   the plan's two-minute test (§10) in its plainest possible form.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

function Card({
  href,
  title,
  detail,
  tone,
}: {
  href: string;
  title: string;
  detail: string;
  tone?: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg px-6 py-6 transition-opacity hover:opacity-80"
      style={{ border: "1px solid var(--border)", background: "#fff" }}
    >
      <div className="text-[17px] font-medium mb-1" style={{ color: "#111" }}>
        {title}
      </div>
      <div className="text-[13.5px]" style={{ color: tone ?? "#707072" }}>
        {detail}
      </div>
    </Link>
  );
}

export default async function AdminHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin");

  const uk = locale === "uk";
  const [items, months, partnersRead] = await Promise.all([
    fetchStock(),
    fetchFinanceMonths(1),
    fetchPartners(),
  ]);

  const needsAttention =
    items === null ? null : items.filter((i) => stockLevel(i) !== "ok").length;

  const thisMonth = (months ?? []).find((m) => m.month === currentPeriod()) ?? null;
  const financeDetail =
    months === null
      ? uk
        ? "Фінанси недоступні"
        : "Finance unavailable"
      : thisMonth === null
        ? uk
          ? "Цього місяця ще порожньо"
          : "Nothing this month yet"
        : `${uk ? "Маржа" : "Margin"} ${formatUah(thisMonth.marginUah)}`;

  const today = new Date().toISOString().slice(0, 10);
  const dueFollowUps =
    partnersRead === null
      ? null
      : partnersRead.partners.filter((p) => followUpDue(p, today)).length;
  const partnersDetail =
    dueFollowUps === null
      ? uk
        ? "Партнери недоступні"
        : "Partners unavailable"
      : dueFollowUps === 0
        ? uk
          ? "Нагадувань немає"
          : "No follow-ups due"
        : uk
          ? `${dueFollowUps} ${dueFollowUps === 1 ? "нагадування" : "нагадувань"} на сьогодні`
          : `${dueFollowUps} follow-up${dueFollowUps === 1 ? "" : "s"} due`;

  const stockDetail =
    needsAttention === null
      ? uk
        ? "Склад недоступний"
        : "Stock unavailable"
      : needsAttention === 0
        ? uk
          ? "Все в нормі"
          : "Everything in stock"
        : uk
          ? `${needsAttention} ${needsAttention === 1 ? "позиція потребує" : "позицій потребують"} уваги`
          : `${needsAttention} ${needsAttention === 1 ? "line needs" : "lines need"} attention`;

  return (
    <div className="min-h-screen pt-28 pb-24" style={{ background: "#f7f6f4" }}>
      <div className="page-container">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-1" style={{ color: "#111" }}>
            {uk ? "Панель" : "Operations"}
          </h1>
          <p className="text-[14.5px]" style={{ color: "#707072" }}>
            Tactical HB
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            href={`/${locale}/admin/orders`}
            title={uk ? "Замовлення" : "Orders"}
            detail={uk ? "Оплачені, ТТН, відправлення" : "Paid orders, waybills, dispatch"}
          />
          <Card
            href={`/${locale}/admin/stock`}
            title={uk ? "Склад" : "Stock"}
            detail={stockDetail}
            tone={needsAttention ? "#96322c" : undefined}
          />
          <Card
            href={`/${locale}/admin/costs`}
            title={uk ? "Витрати" : "Costs"}
            detail={uk ? "Собівартість і операційні витрати" : "Unit costs and operating costs"}
          />
          <Card
            href={`/${locale}/admin/finance`}
            title={uk ? "Фінанси" : "Finance"}
            detail={financeDetail}
            tone={thisMonth !== null && thisMonth.marginUah < 0 ? "#96322c" : undefined}
          />
          <Card
            href={`/${locale}/admin/partners`}
            title={uk ? "Партнери" : "Partners"}
            detail={partnersDetail}
            tone={dueFollowUps ? "#96322c" : undefined}
          />
        </div>
      </div>
    </div>
  );
}
