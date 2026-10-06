import WholesaleRegisterForm from "@/components/wholesale/WholesaleRegisterForm";
import { privatePageMetadata } from "@/lib/seo";

/**
 * Never indexed. An application form has nothing to offer a search result, and
 * the page it belongs to — /wholesale — is the one that should rank.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return privatePageMetadata(locale, { uk: "Заявка на оптовий акаунт", en: "Apply for a wholesale account", ja: "卸売アカウントのお申し込み", ar: "التقديم لحساب جملة" });
}

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
