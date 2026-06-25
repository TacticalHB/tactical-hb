import type { Metadata } from "next";
import { Bebas_Neue, Inter, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" });
const barlowCondensed = Barlow_Condensed({ weight: ["600", "700"], subsets: ["latin"], variable: "--font-barlow" });

export const metadata: Metadata = {
  title: "Tactical HB — Premium Hookah Accessories",
  description: "Ukrainian premium hookah accessories inspired by weaponry aesthetics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${inter.variable} ${bebasNeue.variable} ${barlowCondensed.variable} h-full`}>
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
        {children}
      </body>
    </html>
  );
}
