import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { partnerForUser, requestsForUser } from "@/lib/wholesale-portal";
import { canAccessPortal, type RequestStatus } from "@/lib/wholesale-display";
import { privatePageMetadata } from "@/lib/seo";
import PrintDocumentButton from "@/components/wholesale/PrintDocumentButton";
import OrderDocument, { documentLabels } from "@/components/wholesale/OrderDocument";

/* ---------------------------------------------------------------------------
   A partner's order confirmation, as a printable document (Mario, 15 Oct
   2026 — "downloadable invoice and order PDFs" for each approved order).

   PRINT-TO-PDF, NOT A PDF LIBRARY. The site carries no PDF engine and no font
   it may bundle that covers Cyrillic and ₴, so the page is laid out for A4 and
   "Save as PDF" opens the browser's own print dialog — which every browser,
   Safari included, turns into a PDF file. Outside the (shop) group on purpose:
   no header, footer or cookie bar to print.

   AN ORDER CONFIRMATION, NOT A TAX INVOICE. It carries no bank details and no
   registration numbers, because nothing on the site holds them; a formal
   invoice with the seller's requisites is a separate document if wanted.

   ONLY THE PARTNER'S OWN, ONLY ONCE APPROVED. Looked up inside their own
   request list (requestsForUser), so a reference belonging to anyone else is
   simply not found, and only at "payment details sent" or "paid".
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

const DOCUMENT_STATUSES: RequestStatus[] = ["payment_sent", "paid"];

export async function generateMetadata({ params }: { params: Promise<{ locale: string; reference: string }> }) {
  const { locale, reference } = await params;
  return privatePageMetadata(locale, {
    uk: `Замовлення ${reference}`,
    en: `Order ${reference}`,
    ja: `ご注文 ${reference}`,
    ar: `الطلب ${reference}`,
  });
}

export default async function WholesaleDocumentPage({ params }: { params: Promise<{ locale: string; reference: string }> }) {
  const { locale, reference } = await params;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) redirect(`/${locale}/login?redirect=${encodeURIComponent(`/${locale}/wholesale-document/${reference}`)}`);

  const partner = await partnerForUser(user.id);
  if (!partner || !canAccessPortal(partner.accountStatus)) notFound();
  const r = (await requestsForUser(user.id)).find((x) => x.reference === decodeURIComponent(reference));
  if (!r || !DOCUMENT_STATUSES.includes(r.status)) notFound();

  return (
    <OrderDocument
      r={r}
      partner={partner}
      locale={locale}
      toolbar={<PrintDocumentButton label={documentLabels(locale).save} back={documentLabels(locale).back} backHref={`/${locale}/wholesale/portal`} />}
    />
  );
}
