import KitBuilder from "@/components/KitBuilder";

export default async function SetupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div className="min-h-screen pt-24" style={{ background: "var(--bg)" }}>
      <KitBuilder locale={locale} />
    </div>
  );
}
