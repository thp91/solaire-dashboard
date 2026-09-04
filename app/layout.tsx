import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter sert de repli sur les appareils non-Apple ; SF Pro prend le relais
// sur macOS/iOS via la pile système définie dans globals.css.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EnerVisio",
  description: "Supervision intelligente de vos installations énergétiques",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#f5f5f7] text-[#1d1d1f]">{children}</body>
    </html>
  );
}
