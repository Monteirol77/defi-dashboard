import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PaperTradingProvider } from "@/contexts/PaperTradingContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DeFi Dashboard | UNI & PENDLE",
  description: "Dashboard UNI e PENDLE com CoinGecko, paper trading e agente automático.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PaperTradingProvider>{children}</PaperTradingProvider>
      </body>
    </html>
  );
}
