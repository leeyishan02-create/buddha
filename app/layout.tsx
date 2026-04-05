import type { Metadata } from "next";
import { Noto_Serif_TC, Noto_Sans_TC } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeToggle";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import "./globals.css";

// Noto Serif TC — for reading content (宣紙上的經文)
const notoSerifTC = Noto_Serif_TC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-serif-tc",
  display: "swap",
});

// Noto Sans TC — for UI elements
const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-tc",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "觀心 — 佛典閱讀器",
    template: "%s | 觀心",
  },
  description: "探索佛教經典，從大藏經中尋找智慧",
  keywords: ["佛典", "CBETA", "佛教", "閱讀器", "大藏經", "觀心"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className={`${notoSerifTC.variable} ${notoSansTC.variable} h-full antialiased`}>
      <body className={`min-h-full bg-bg-primary text-text-primary ${notoSansTC.className} theme-transition`}>
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1" role="main">
              {children}
            </main>
            <MobileNav />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
