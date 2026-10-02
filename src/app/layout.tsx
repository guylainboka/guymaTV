import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Sora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});
const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "guymaTV - Streaming Gratuit, Sécurisé & Sans Publicité",
  description:
    "Votre portail de streaming gratuit, illimité et sans publicité avec flux HD & 4K, sans pub et multi-plateformes.",
  keywords: ["guymaTV", "streaming", "gratuit", "sans pub", "films", "séries"],
  authors: [{ name: "guymaTV" }],
  openGraph: {
    title: "guymaTV - Streaming Gratuit, Sécurisé & Sans Publicité",
    description:
      "Votre portail de streaming gratuit, illimité et sans publicité avec flux HD & 4K.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "guymaTV - Streaming Gratuit",
    description: "Streaming gratuit, sécurisé et sans publicité.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning className="dark">
      <head>
        {/* Material Symbols Outlined (kept from original maquette) */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} ${plusJakarta.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
