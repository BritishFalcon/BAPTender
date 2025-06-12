// app/layout.tsx
import "./globals.css";
import React from "react";
import Script from 'next/script';

export const metadata = {
  title: "BAPTender 2025 - Polished Edition",
  description: "Track your BAC with cyberpunk style. Drink responsibly, you legend.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ visibility: "hidden" }}>
      <head>
        <Script
          id="init-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var themes = ['theme-og','theme-dark','theme-cyber','theme-neon'];
                  var stored = localStorage.getItem('themeIndex');
                  var idx = stored !== null ? parseInt(stored, 10) : 0;
                  if (isNaN(idx) || idx < 0 || idx >= themes.length) idx = 0;
                  document.documentElement.className = themes[idx];
                  document.documentElement.style.visibility = 'visible';
                } catch (e) {
                  document.documentElement.className = themes[0];
                  document.documentElement.style.visibility = 'visible';
                }
              })();
            `,
          }}
        />
        <Script
          src="https://code.jquery.com/jquery-3.6.0.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://d3js.org/d3.v3.min.js" // Epoch uses older D3
          strategy="beforeInteractive"
        />
        {/* Link to Epoch CSS */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/epoch/0.8.4/css/epoch.min.css"
          // If you have it locally: href="/path/to/your/epoch.min.css"
        />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/epoch/0.8.4/js/epoch.min.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}