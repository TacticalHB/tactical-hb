import { Suspense } from "react";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

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
