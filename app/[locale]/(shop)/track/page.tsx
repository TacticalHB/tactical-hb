import { t } from "@/lib/i18n-text";
import { privatePageMetadata } from "@/lib/seo";
import TrackOrderForm from "@/components/TrackOrderForm";

/* "Track my order" — for anyone, account or not (Mario, 15 Oct 2026).
   Not indexed: it has nothing to say to a search engine. */

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return privatePageMetadata(locale, { uk: "Відстежити замовлення", en: "Track your order", ja: "注文の追跡", ar: "تتبّع طلبك" });
}

export default async function TrackPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div className="min-h-screen pt-32 pb-24" style={{ background: "var(--bg)" }}>
      <div className="page-container max-w-[760px]">
        <h1 className="font-display text-5xl md:text-6xl mb-3" style={{ color: "var(--text)" }}>
          {t(locale, { uk: "Відстежити замовлення", en: "Track your order", ja: "注文の追跡", ar: "تتبّع طلبك" })}
        </h1>
        <p className="text-[15px] leading-relaxed mb-10 max-w-xl" style={{ color: "var(--text-muted)" }}>
          {t(locale, {
            uk: "Без акаунта: введіть номер замовлення з листа-підтвердження та пошту, з якою його оформлено.",
            en: "No account needed: enter the order number from your confirmation email and the email you ordered with.",
            ja: "アカウント不要。確認メールに記載のご注文番号と、ご注文時のメールアドレスを入力してください。",
            ar: "لا حاجة إلى حساب: أدخل رقم الطلب من رسالة التأكيد والبريد الذي طلبت به.",
          })}
        </p>
        <TrackOrderForm locale={locale} />
      </div>
    </div>
  );
}
