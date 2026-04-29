import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uncle Sam's Cart | Weird Government Buys",
  description: "See the weirdest things Uncle Sam is shopping for — all backed by real open contracts on SAM.gov.",
  openGraph: {
    title: "Uncle Sam's Cart",
    description: "Source-linked public records from SAM.gov.",
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
