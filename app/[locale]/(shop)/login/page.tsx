import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return privatePageMetadata(locale, { uk: "Вхід", en: "Sign in", ja: "ログイン", ar: "تسجيل الدخول" });
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <Suspense>
      <LoginForm locale={locale} />
    </Suspense>
  );
}
