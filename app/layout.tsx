import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PharmX Voice Social - Meet new people. Be social.",
  description: "Connect with new people through voice calls and text chats",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PharmX Voice",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "PharmX Voice Social",
    description: "Meet new people. Be social.",
    url: "https://chat.pharmx.co.uk",
    siteName: "PharmX Voice Social",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PharmX Voice" />
      </head>
      <body
        className={`${figtree.variable} font-sans antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
