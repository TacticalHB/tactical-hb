import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { isAppLocale } from "@/i18n/routing";
import { AuthProvider } from "@/components/AuthContext";

/* ---------------------------------------------------------------------------
   Locale root: only what BOTH faces of the app need — messages and a session.

   The storefront chrome (nav, footer, cart, favourites, cookie banner) lives
   in (shop)/layout.tsx; the admin console brings its own shell in
   admin/layout.tsx. Splitting here is what lets /admin stop looking like the
   shop at all, which is the whole point of OS Phase E.
--------------------------------------------------------------------------- */

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AuthProvider>{children}</AuthProvider>
    </NextIntlClientProvider>
  );
}
