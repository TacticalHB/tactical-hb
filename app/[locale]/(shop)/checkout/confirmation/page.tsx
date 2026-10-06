import ConfirmationClient from "@/components/checkout/ConfirmationClient";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return privatePageMetadata(locale, { uk: "Підтвердження замовлення", en: "Order confirmation", ja: "ご注文の確認", ar: "تأكيد الطلب" });
}

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <ConfirmationClient locale={locale} />;
}
