export default async function FavouritesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const uk = locale === "uk";
  return (
    <div>
      <h1 className="text-3xl font-semibold mb-2" style={{ color: "#111" }}>{uk ? "Обране" : "Favourites"}</h1>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {uk ? "Ваші збережені товари з'являться тут — незабаром." : "Your saved products will appear here — coming next."}
      </p>
    </div>
  );
}
