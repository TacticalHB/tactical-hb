import RegisterForm from "@/components/auth/RegisterForm";

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <RegisterForm locale={locale} />;
}
