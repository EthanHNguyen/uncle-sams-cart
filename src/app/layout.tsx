import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uncle Sam's Cart | Weird Government Buys",
  description: "A source-linked receipt of the weirdest things Uncle Sam is shopping for today. Real public records. Weird carts.",
  openGraph: {
    title: "Uncle Sam's Cart",
    description: "Real public records. Weird carts.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body>{children}</body>
    </html>
  );
}
