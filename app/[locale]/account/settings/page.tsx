import SettingsForm from "@/components/account/SettingsForm";
import { requireUser } from "@/lib/supabase/require-user";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireUser(locale); // signed-in only
  return <SettingsForm locale={locale} />;
}
