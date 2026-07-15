export default async function LoyaltyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const uk = locale === "uk";
  return (
    <div>
      <h1 className="text-3xl font-semibold mb-2" style={{ color: "#111" }}>{uk ? "Бонуси" : "Loyalty"}</h1>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {uk ? "Прогрес XP, історія балів та ваучери — незабаром." : "XP progress, points history and vouchers — coming next."}
      </p>
    </div>
  );
}
