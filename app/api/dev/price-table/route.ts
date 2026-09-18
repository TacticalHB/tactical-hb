import { NextResponse } from "next/server";
import { priceTable, tableBooks, bookLabel, groupLabel } from "@/lib/wholesale-price-table";

export const runtime = "nodejs";

/* The admin price table's DATA, for checking without a signed-in session.
   Development only, 404 in production — the page itself is admin-gated and
   this is not a second way in: it carries no customer data and no controls,
   only the trade book figures that already live in version control. */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }
  const locale = new URL(req.url).searchParams.get("locale") ?? "en";
  const books = tableBooks();
  return NextResponse.json({
    books: books.map((b) => ({ key: b, label: bookLabel(b, locale) })),
    retailColumn: locale === "uk" ? "Роздріб (сайт)" : "Retail (site)",
    rows: priceTable(locale).map((r) => ({
      ...r,
      groupLabel: groupLabel(r.group, locale),
    })),
  });
}
