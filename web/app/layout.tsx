import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Footer from "@/components/footer";
import Header from "@/components/header";
import Providers from "@/lib/providers";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agent Bazar — Hire DeFi Agents on Optimism",
  description:
    "A DeFi talent marketplace. Hire LP agents, earn advisors, and an AI concierge that act on your Dynamic embedded wallet via delegated signing with spend guardrails.",
  icons: {
    icon: "/brand/icon-dark.png",
    apple: "/brand/icon-dark.png",
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <Header />
          <div className="bg-muted flex min-h-svh flex-col items-center justify-start gap-6 p-6 pb-24 pt-20 md:p-10 md:pt-24">
            {children}
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
