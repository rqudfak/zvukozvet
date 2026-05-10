import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import HeaderNav from "@/components/HeaderNav";
import SiteFooter from "@/components/SiteFooter";
import FlashSuccess from "@/components/FlashSuccess";

export const metadata: Metadata = {
  title: "ЗвукоЦвет",
  description: "Frontend на Next.js для Laravel API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,200..1000;1,200..1000&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/css/layouts.css" />
        <link rel="stylesheet" href="/css/announcements.css" />
        <link rel="stylesheet" href="/css/announcements_show.css" />
        <link rel="stylesheet" href="/css/auth.css" />
        <link rel="stylesheet" href="/css/profile.css" />
        <link rel="stylesheet" href="/css/admin.css" />
        <link rel="stylesheet" href="/css/admin-stats.css" />
        <link rel="stylesheet" href="/css/about.css" />
        <link rel="stylesheet" href="/css/contacts.css" />
      </head>
      <body>
        <Script src="/js/security.js" strategy="afterInteractive" />
        <Script src="/js/notification.js" strategy="afterInteractive" />
        <header>
          <HeaderNav />
        </header>

        <main>
          <div className="center">
            <FlashSuccess />
            {children}
          </div>
        </main>

        <SiteFooter />
      </body>
    </html>
  );
}
