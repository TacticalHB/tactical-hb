import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-guard";
import { fetchStock } from "@/lib/stock-admin";
import { stockLevel } from "@/lib/stock-display";

/* ---------------------------------------------------------------------------
   Admin home.

   Three links and one number, and that is the whole ambition for now. The
   department map belongs to Phase E of the OS plan, and building it before the
   modules exist would produce an impressive menu of empty rooms — the plan is
   explicit that data comes first and the pyramid last.

   The one number it does show is how many stock lines need attention, because
   that is the question the founder opens this page to answer.
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
  const items = await fetchStock();

  const needsAttention =
    items === null ? null : items.filter((i) => stockLevel(i) !== "ok").length;

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
        </div>
      </div>
    </div>
  );
}
