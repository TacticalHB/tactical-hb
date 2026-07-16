import FavouritesList from "@/components/account/FavouritesList";

export default async function FavouritesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <FavouritesList locale={locale} />;
}
