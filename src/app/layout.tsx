import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MoneyBags — Invest Fake Money",
  description:
    "Simulate famous market crashes and bull runs with real financial instruments. No real money required. Snark included.",
  openGraph: {
    title: "MoneyBags — Invest Fake Money",
    description:
      "Simulate famous market crashes and bull runs with real financial instruments.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-base text-primary`}
      >
        {children}
      </body>
    </html>
  );
}
