import CheckoutSuccessClient from "@/components/checkout/CheckoutSuccessClient";

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <CheckoutSuccessClient locale={locale} />;
}
