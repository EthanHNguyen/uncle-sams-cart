import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ethanhn.com"),
  title: "Uncle Sam's Cart | Weird Government Buys",
  description: "I found the weirdest real government shopping receipt on SAM.gov.",
  alternates: {
    canonical: "/uncle-sams-cart/",
  },
  icons: {
    icon: [
      { url: "/uncle-sams-cart/favicon.ico", sizes: "any" },
      { url: "/uncle-sams-cart/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/uncle-sams-cart/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/uncle-sams-cart/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    title: "Uncle Sam's Cart",
    capable: true,
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Uncle Sam's Cart",
    description: "I found the weirdest real government shopping receipt on SAM.gov.",
    url: "/uncle-sams-cart/",
    siteName: "EthanHN",
    type: "website",
    images: [
      {
        url: "/uncle-sams-cart/og-uncle-sams-cart.png",
        width: 1200,
        height: 630,
        alt: "Uncle Sam's Cart — actual SAM.gov public records arranged like a receipt.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Uncle Sam's Cart",
    description: "I found the weirdest real government shopping receipt on SAM.gov.",
    images: ["/uncle-sams-cart/og-uncle-sams-cart.png"],
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
