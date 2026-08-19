import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rab7na | ربحانة",
  description:
    "اكتشف أفضل المنتجات والعروض على Rab7na",
  keywords: [
    "Rab7na",
    "ربحانة",
    "منتجات",
    "عروض",
    "تسوق",
  ],
  openGraph: {
    title: "Rab7na | ربحانة",
    description: "اكتشف أفضل المنتجات والعروض",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
