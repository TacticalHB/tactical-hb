import type { Metadata } from "next";
import { metadataFor } from "@/lib/seo";
import KitBuilder from "@/components/KitBuilder";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataFor({ locale, path: "/setup", key: "setup" });
}

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
