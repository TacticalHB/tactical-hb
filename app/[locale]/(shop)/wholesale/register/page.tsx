import type { Metadata } from "next";
import WholesaleRegisterForm from "@/components/wholesale/WholesaleRegisterForm";

/**
 * Never indexed. An application form has nothing to offer a search result, and
 * the page it belongs to — /wholesale — is the one that should rank.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function WholesaleRegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div className="min-h-screen pt-32 pb-20 px-6" style={{ background: "var(--bg)" }}>
      <div className="page-container">
        <WholesaleRegisterForm locale={locale} />
      </div>
    </div>
  );
}
