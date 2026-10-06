import SettingsForm from "@/components/account/SettingsForm";
import { requireUser } from "@/lib/supabase/require-user";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return privatePageMetadata(locale, { uk: "Налаштування", en: "Settings", ja: "設定", ar: "الإعدادات" });
}

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireUser(locale); // signed-in only
  return <SettingsForm locale={locale} />;
}
