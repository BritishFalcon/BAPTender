// /app/layout.tsx
import "./globals.css"; // Contains font imports and theme variables
import React from "react";
import Script from 'next/script';
// Removed direct font links as they are in globals.css

export const metadata = {
  title: "BAPTender 2025 - Polished Edition",
  description: "Track your BAC with cyberpunk style. Drink responsibly, you legend.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="theme-og"> {/* Default theme */}
      <head>
        {/* jQuery and D3 are still needed for Epoch if you keep Graph.tsx as is */}
        <Script
          src="https://code.jquery.com/jquery-3.6.0.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://d3js.org/d3.v3.min.js" // Epoch uses older D3
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/epoch/0.8.4/js/epoch.min.js"
          strategy="beforeInteractive"
        />
        {/* title is now in metadata, Next.js handles it */}
      </head>
      <body>
        {/* Particle container will be handled by the ParticlesBackground component logic */}
        {children}
      </body>
    </html>
  );
}