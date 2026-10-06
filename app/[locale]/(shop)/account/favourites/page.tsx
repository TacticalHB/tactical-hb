import FavouritesList from "@/components/account/FavouritesList";
import { privatePageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return privatePageMetadata(locale, { uk: "Обране", en: "Favourites", ja: "お気に入り", ar: "المفضّلة" });
}

export default async function FavouritesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <FavouritesList locale={locale} />;
}
