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
  title: "PharmX Social - Meet New People",
  description: "Connect with new people through voice calls and text chats. Join PharmX Social to meet like-minded individuals.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PharmX Social",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "PharmX Social - Meet New People",
    description: "Connect with new people through voice calls and text chats. Join PharmX Social to meet like-minded individuals.",
    url: "https://chat.pharmx.co.uk",
    siteName: "PharmX Social",
    type: "website",
    images: [
      {
        url: "https://assets.pharmx.co.uk/X%20favicon%20circle%20black.png",
        width: 512,
        height: 512,
        alt: "PharmX Social",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "PharmX Social - Meet New People",
    description: "Connect with new people through voice calls and text chats.",
    images: ["https://assets.pharmx.co.uk/X%20favicon%20circle%20black.png"],
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PharmX Social" />
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
