export default async function OrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const uk = locale === "uk";
  return (
    <div>
      <h1 className="text-3xl font-semibold mb-2" style={{ color: "#111" }}>{uk ? "Замовлення" : "Orders"}</h1>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {uk
          ? "Історія замовлень з'явиться тут після підключення оформлення (Shopify)."
          : "Your order history will appear here once checkout (Shopify) is connected."}
      </p>
    </div>
  );
}
