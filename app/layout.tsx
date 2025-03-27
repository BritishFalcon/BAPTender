// /app/layout.tsx
import "./globals.css";
import { BAPTenderProvider } from "@/context/BAPTenderContext";

export const metadata = {
  title: "BAPTender-2",
  description: "Keep track of your drinks like a boss",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BAPTenderProvider>
          {children}
        </BAPTenderProvider>
      </body>
    </html>
  );
}
