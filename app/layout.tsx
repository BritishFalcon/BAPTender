// /app/layout.tsx
import "./globals.css";
import React from "react";
import Script from 'next/script';

export const metadata = {
  title: "BAPTender 2025",
  description: "Keep track of your drinks like a boss",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://code.jquery.com/jquery-3.6.0.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://d3js.org/d3.v3.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/epoch/0.8.4/js/epoch.min.js"
          strategy="beforeInteractive"
        /><title>{metadata.title}</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
