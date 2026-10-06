import CheckoutSuccessClient from "@/components/checkout/CheckoutSuccessClient";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return privatePageMetadata(locale, { uk: "Дякуємо за замовлення", en: "Thank you for your order", ja: "ご注文ありがとうございます", ar: "شكرًا لطلبك" });
}

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <CheckoutSuccessClient locale={locale} />;
}
