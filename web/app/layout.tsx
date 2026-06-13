import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Footer from "@/components/footer";
import Header from "@/components/header";
import Providers from "@/lib/providers";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LiFi Composer + Dynamic Delegated Access",
  description:
    "Mint Uniswap USDC/USDT liquidity on Optimism via LiFi Composer, signed with Dynamic delegated wallet access.",
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
