import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "parska — polski stand-up w jednym miejscu",
  description:
    "Agregator polskiego stand-upu. Nowe specjale, klipy, podcasty, trasy i open-miki.",
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
