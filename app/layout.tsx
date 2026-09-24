import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { AccountProvider } from "@/components/Account";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { SiteStateProvider } from "@/components/SiteState";
import WordsPanel from "@/components/WordsPanel";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Utopia Daily — good news for English learners",
  description:
    "Uplifting, openly fictional news stories in five English levels (A1–C1). Read at your level, save new words and practise retelling.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <SiteStateProvider>
          <AccountProvider>
            <SiteHeader />
            <div className="page">
              <main>{children}</main>
              <WordsPanel />
            </div>
            <SiteFooter />
          </AccountProvider>
        </SiteStateProvider>
      </body>
    </html>
  );
}
