import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tactical HB — Premium Hookah Accessories",
  description: "Ukrainian premium hookah accessories inspired by weaponry aesthetics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className="h-full">
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
        {children}
      </body>
    </html>
  );
}
