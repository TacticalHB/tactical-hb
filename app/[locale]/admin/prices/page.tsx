import { requireAdminPage } from "@/lib/admin-guard";
import { priceTable, tableBooks, bookLabel, groupLabel, type PriceRow } from "@/lib/wholesale-price-table";
import { formatMoney } from "@/lib/currency";

/* ---------------------------------------------------------------------------
   Admin: the trade price books, side by side.

   A REFERENCE SCREEN, NOT A CONTROL. Nothing here writes anything — the books
   live in lib/wholesale-prices.ts and a price change is a commit, deliberately,
   because the portal charges from that file and a number editable from a phone
   is a number nobody can review. This page exists so that looking one up does
   not mean opening the repository or the partner-facing PDF.

   THREE BOOKS, AND TWO OF THEM ARE THE SAME TODAY. Shop and distribution carry
   identical figures until distributors are repriced; the table says so in as
   many words rather than leaving a reader to compare twelve pairs by eye, and
   marks the rows that genuinely differ.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export default async function AdminPricesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/prices");

  const uk = locale === "uk";
  const books = tableBooks();
  const rows = priceTable(locale);

  const L = {
    title: uk ? "Оптові прайси" : "Trade price books",
    intro: uk
      ? "Що ми беремо з партнера за кожною книгою. Лише для довідки — ціни змінюються у коді."
      : "What a partner pays on each book. Reference only — prices are changed in the code.",
    source: uk
      ? "Джерело: lib/wholesale-prices.ts. Портал рахує з того самого файлу, тож ця таблиця не може з ним розійтися."
      : "Source: lib/wholesale-prices.ts. The portal charges from that same file, so this table cannot disagree with it.",
    identical: uk
      ? "Дистрибуція має ті самі цифри, що й магазин, доки її не переоцінять окремо."
      : "Distribution carries the same figures as shop until it is repriced separately.",
    varies: uk ? "дистрибуція окремо" : "distribution repriced",
    unavailableNote: uk
      ? "Позиції, яких зараз немає, лишаються в таблиці — ціна не перестає бути чинною, поки полиця порожня."
      : "Items that cannot be sold today stay in the table — the price does not stop being true because the shelf is empty.",
    none: uk ? "—" : "—",
    noneNote: uk ? "— означає, що оптову ціну ще не узгоджено." : "— means no trade price has been agreed yet.",
  };

  const groups = ["hmd", "bowl", "windcover", "accessory", "addon"] as const;

  return (
    <div className="min-h-screen pt-10 pb-24" style={{ background: "var(--console-bg-2)" }}>
      <div className="page-container">
        <header className="mb-7">
          <h1 className="text-3xl font-semibold mb-1" style={{ color: "var(--console-text)" }}>
            {L.title}
          </h1>
          <p className="text-[14.5px]" style={{ color: "var(--console-muted)" }}>
            {L.intro}
          </p>
        </header>

        {/* Said once, at the top. Two identical columns with no explanation is
            the kind of thing a reader assumes is a rendering bug. */}
        <div
          className="rounded-lg px-4 py-3 mb-6 text-[13px]"
          style={{
            border: "1px solid var(--console-border)",
            background: "var(--console-panel-2)",
            color: "var(--console-muted)",
          }}
        >
          {L.identical}
        </div>

        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--console-border)", background: "var(--console-panel)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th
                    className="text-left px-4 py-3 text-[11px] tracking-[0.12em] uppercase font-normal"
                    style={{ color: "var(--console-muted)", background: "var(--console-panel-2)", borderBottom: "1px solid var(--console-border)" }}
                  >
                    {uk ? "Позиція" : "Item"}
                  </th>
                  {books.map((b) => (
                    <th
                      key={b}
                      className="text-right px-4 py-3 text-[11px] tracking-[0.12em] uppercase font-normal whitespace-nowrap"
                      style={{ color: "var(--console-muted)", background: "var(--console-panel-2)", borderBottom: "1px solid var(--console-border)" }}
                    >
                      {bookLabel(b, locale)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const inGroup = rows.filter((r: PriceRow) => r.group === g);
                  if (inGroup.length === 0) return null;
                  return (
                    <GroupBlock
                      key={g}
                      label={groupLabel(g, locale)}
                      rows={inGroup}
                      cols={books.length}
                      variesLabel={L.varies}
                      none={L.none}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[12.5px] mt-4" style={{ color: "var(--console-faint)" }}>
          {L.noneNote}
        </p>
        <p className="text-[12.5px] mt-1" style={{ color: "var(--console-faint)" }}>
          {L.unavailableNote}
        </p>
        <p className="text-[12.5px] mt-1" style={{ color: "var(--console-faint)" }}>
          {L.source}
        </p>
      </div>
    </div>
  );
}

function GroupBlock({
  label,
  rows,
  cols,
  variesLabel,
  none,
}: {
  label: string;
  rows: PriceRow[];
  cols: number;
  variesLabel: string;
  none: string;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={cols + 1}
          className="px-4 pt-5 pb-2 text-[11px] tracking-[0.14em] uppercase"
          style={{ color: "var(--console-accent)" }}
        >
          {label}
        </td>
      </tr>
      {rows.map((r) => (
        <tr key={r.key}>
          <td
            className="px-4 py-2.5"
            style={{ color: "var(--console-text)", borderBottom: "1px solid var(--console-border)" }}
          >
            {r.label}
            {/* Two different notes, and neither is colour-coded: the accent is
                the brand's, not a status hue. */}
            {r.availability !== "available" && (
              <span className="ml-2 text-[10.5px] tracking-[0.1em] uppercase" style={{ color: "var(--console-faint)" }}>
                {r.availabilityLabel}
              </span>
            )}
            {r.distributionDiffers && (
              <span className="ml-2 text-[10.5px] tracking-[0.1em] uppercase" style={{ color: "var(--console-warn)" }}>
                {variesLabel}
              </span>
            )}
          </td>
          {r.prices.map((m, i) => (
            <td
              key={i}
              className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap"
              style={{ color: m ? "var(--console-text)" : "var(--console-faint)", borderBottom: "1px solid var(--console-border)" }}
            >
              {m ? (
                <>
                  {formatMoney(m, "EUR")}
                  <span style={{ color: "var(--console-muted)" }}> · {formatMoney(m, "UAH")}</span>
                </>
              ) : (
                none
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
