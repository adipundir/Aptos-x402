import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SessionProvider } from "@/components/auth/SessionProvider";
import Navbar from "./components/Navbar";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aptos x402 - HTTP 402 Payment Protocol",
  description: "First x402 implementation on Aptos blockchain. Add blockchain payments to your Next.js APIs with simple middleware configuration.",
  openGraph: {
    title: "Aptos x402 - HTTP 402 Payment Protocol",
    description: "First x402 implementation on Aptos blockchain. Monetize your APIs with blockchain micropayments.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aptos x402 - HTTP 402 Payment Protocol",
    description: "First x402 implementation on Aptos blockchain. Monetize your APIs with blockchain micropayments.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <SessionProvider>
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
