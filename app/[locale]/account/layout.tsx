import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountNav from "@/components/account/AccountNav";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  if (!supabase) redirect(`/${locale}/login`);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?redirect=/${locale}/account`);

  return (
    <div className="min-h-screen pt-24 pb-20 px-6" style={{ background: "#ffffff" }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 md:gap-12">
        <AccountNav locale={locale} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
