import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "parska — polski stand-up w jednym miejscu",
  description:
    "Agregator polskiego stand-upu. Nowe specjale, klipy, podcasty, trasy i open-miki.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "parska",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "parska — polski stand-up w jednym miejscu",
    description:
      "Agregator polskiego stand-upu. Nowe specjale, klipy, podcasty, trasy i open-miki.",
    url: "https://parska.pl",
    siteName: "parska",
    locale: "pl_PL",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
