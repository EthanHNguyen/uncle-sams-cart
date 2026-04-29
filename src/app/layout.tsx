import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uncle Sam's Cart | Weird Government Buys",
  description: "Actual government contract notices, presented as a shopping receipt because democracy apparently needs fish food.",
  openGraph: {
    title: "Uncle Sam's Cart",
    description: "Actual government shopping errands. Weird receipt. Official sources.",
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
