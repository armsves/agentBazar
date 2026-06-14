import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Footer from "@/components/footer";
import Header from "@/components/header";
import Providers from "@/lib/providers";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agent Bazar — Dynamic Delegated DeFi Agents",
  description:
    "Marketplace of DeFi agents that act on your Dynamic embedded wallet via delegated MPC signing, with spend caps and contract guardrails.",
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
          <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
            {children}
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
