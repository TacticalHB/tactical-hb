import SettingsForm from "@/components/account/SettingsForm";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <SettingsForm locale={locale} />;
}
