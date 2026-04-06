import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: {
    default: "Latince Sözlük",
    template: "%s | Latince Sözlük",
  },
  description:
    "32.000+ Latince kelime, tam çekim tabloları, Türkçe ve İngilizce çeviriler. Wiktionary'den derlenen kapsamlı Latince sözlük.",
  keywords: ["latince", "latince sözlük", "latin dictionary", "çekim tablosu", "latince çeviri"],
  openGraph: {
    title: "Latince Sözlük",
    description: "32.000+ Latince kelime · çekim tabloları · Türkçe çeviriler",
    locale: "tr_TR",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${geist.variable} ${geistMono.variable} font-sans bg-stone-50 text-stone-900 min-h-screen`}>
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
