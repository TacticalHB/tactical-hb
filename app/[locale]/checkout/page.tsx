import CheckoutClient from "@/components/checkout/CheckoutClient";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <CheckoutClient locale={locale} />;
}
