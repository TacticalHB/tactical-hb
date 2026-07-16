import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/components/CartContext";
import { AuthProvider } from "@/components/AuthContext";
import { FavouritesProvider } from "@/components/FavouritesProvider";
import { Toaster } from "sonner";
import CookieConsent from "@/components/CookieConsent";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "uk" | "en")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AuthProvider>
      <FavouritesProvider locale={locale}>
      <CartProvider>
        {/* White frame around the whole page (Apple-style grid frame) */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[100]"
          style={{ border: "10px solid #ffffff" }}
        />
        <Navbar locale={locale} />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster position="bottom-center" richColors closeButton />
        <CookieConsent locale={locale} />
      </CartProvider>
      </FavouritesProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
