import "./globals.css";
import React from "react";
import { cookies } from 'next/headers';
import type { Metadata } from 'next';

// Define metadata with all the bells and whistles
export const metadata: Metadata = {
  metadataBase: new URL('https://baptender.com'),
  title: "BAPTender | Track Your Drinks, Know Your BAC",
  description: "BAPTender is a fun, multiplayer real-time BAC tracker and alcohol logging tool, built to promote awareness and group safety. Track your drinks with friends, monitor your sobriety, and drink smarter with our sleek, night-out friendly design.",
  
  // Add the crucial viewport tag
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },

  // Open Graph (for Facebook, Discord, etc.)
  openGraph: {
    title: 'BAPTender | Track Your Drinks, Know Your BAC',
    description: 'A real-time, multiplayer BAC tracker to help you and your friends drink smarter.',
    url: 'https://baptender.com',
    siteName: 'BAPTender',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'BAPTender | Track Your Drinks, Know Your BAC',
    description: 'A real-time, multiplayer BAC tracker to help you and your friends drink smarter.',
    images: ['/og-image.png'], // Twitter uses the same OG image
  },
  
  // PWA Stuff
  applicationName: "BAPTender",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BAPTender",
  },
  formatDetection: {
    telephone: false,
  },
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const theme = cookieStore.get('theme')?.value || 'theme-og';

  return (
    <html lang="en" className={theme}>
    <head>
        <link rel="manifest" href="/manifest.json"/>
        <link rel="apple-touch-icon" href="/icons/baptender_icon_180x180.png"/>
    </head>
    <body>
        {children}
    </body>
    </html>
  );
}