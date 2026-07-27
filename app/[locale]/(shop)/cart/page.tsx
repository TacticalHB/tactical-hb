import CartPageClient from "@/components/cart/CartPageClient";

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div style={{ background: "var(--bg)" }}>
      <CartPageClient locale={locale} />
    </div>
  );
}
