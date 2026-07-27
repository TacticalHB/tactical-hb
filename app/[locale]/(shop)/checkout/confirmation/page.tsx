import ConfirmationClient from "@/components/checkout/ConfirmationClient";

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <ConfirmationClient locale={locale} />;
}
