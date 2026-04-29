import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uncle Sam's Cart | Weird Government Buys",
  description: "Real SAM.gov contract notices, dressed up as a government shopping receipt with better jokes.",
  openGraph: {
    title: "Uncle Sam's Cart",
    description: "Real government shopping errands. Weird receipt. Official sources.",
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
