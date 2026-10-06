import RegisterForm from "@/components/auth/RegisterForm";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return privatePageMetadata(locale, { uk: "Реєстрація", en: "Create an account", ja: "アカウント登録", ar: "إنشاء حساب" });
}

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <RegisterForm locale={locale} />;
}
