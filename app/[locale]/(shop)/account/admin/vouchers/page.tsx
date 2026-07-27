import { redirect } from "next/navigation";

// Phase E moved this into the console. Kept as a redirect for muscle memory.
export default async function MovedVouchersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/admin/vouchers`);
}
