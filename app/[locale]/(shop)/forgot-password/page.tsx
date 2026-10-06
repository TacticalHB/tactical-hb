import { Suspense } from "react";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return privatePageMetadata(locale, { uk: "Відновлення пароля", en: "Forgotten password", ja: "パスワードをお忘れの方", ar: "نسيت كلمة المرور" });
}

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <Suspense>
      <ForgotPasswordForm locale={locale} />
    </Suspense>
  );
}
