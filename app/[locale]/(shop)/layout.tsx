import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/components/CartContext";
import { FavouritesProvider } from "@/components/FavouritesProvider";
import { Toaster } from "sonner";
import CookieConsent from "@/components/CookieConsent";

/* ---------------------------------------------------------------------------
   Storefront chrome. Everything a customer sees wraps in here; /admin sits
   outside this group and never renders any of it.
--------------------------------------------------------------------------- */

export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <FavouritesProvider locale={locale}>
      <CartProvider>
        <Navbar locale={locale} />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster position="bottom-center" richColors closeButton />
        <CookieConsent locale={locale} />
      </CartProvider>
    </FavouritesProvider>
  );
}
