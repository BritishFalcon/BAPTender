"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BAPTenderProvider } from "@/context/BAPTenderContext";
import { PopupProvider } from "@/context/PopupContext";
import AuthGate from "@/components/AuthGate";
import Header from "@/components/Header";
import dynamic from "next/dynamic";
const Graph = dynamic(() => import("@/components/Graph"), { ssr: false });
import UserBACStatusTable from "@/components/Table";
import DrinkTabs from "@/components/DrinkTabs";
import ParticlesBackground from "@/components/ParticlesBackground";

const themes = ['theme-og', 'theme-dark', 'theme-cyber', 'theme-neon'];

export default function HomePage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const cookieMatch = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    const storedTheme = cookieMatch ? cookieMatch[1] : localStorage.getItem("theme");
    if (storedTheme && themes.includes(storedTheme)) {
      setCurrentThemeIndex(themes.indexOf(storedTheme));
      document.documentElement.className = storedTheme;
    } else {
      document.documentElement.className = themes[currentThemeIndex];
    }

    const verifyTokenAndInitialize = async () => {
      const storedToken = localStorage.getItem("token");
      // console.log("Stored token on load:", storedToken);

      if (storedToken) {
        try {
          // Use /api/users/me (FastAPI Users default, usually no trailing slash for GET /me)
          // next.config.js with trailingSlash: true might normalize this to /api/users/me/
          // which FastAPI might redirect; GET redirects are usually fine.
          const response = await fetch("/api/auth/authenticated-route", {
            headers: {
              "Authorization": `Bearer ${storedToken}`,
            },
          });

          if (response.ok) {
            // const userData = await response.json();
            // console.log("Token verified, user data:", userData);
            setToken(storedToken);
          } else {
            console.warn("Token verification failed, status:", response.status);
            localStorage.removeItem("token"); // Remove invalid token
            setToken(null);
          }
        } catch (error) {
          console.error("Error verifying token:", error);
          localStorage.removeItem("token");
          setToken(null);
        }
      } else {
        setToken(null); // No token found
      }
      setLoading(false); // Verification attempt complete
      if (storedToken && localStorage.getItem("pendingInvite")) {
        const pending = localStorage.getItem("pendingInvite");
        if (pending) {
          localStorage.removeItem("pendingInvite");
          router.push(`/invite/${pending}`);
        }
      }
    };

    verifyTokenAndInitialize();
  }, []); // Run once on mount

  const toggleTheme = () => {
    const nextThemeIndex = (currentThemeIndex + 1) % themes.length;
    setCurrentThemeIndex(nextThemeIndex);
    const newTheme = themes[nextThemeIndex];
    document.documentElement.className = newTheme;
    localStorage.setItem("theme", newTheme);
    document.cookie = `theme=${newTheme}; path=/; max-age=31536000`;
  };

  // Effect to update document class when theme changes
  useEffect(() => {
    const themeName = themes[currentThemeIndex];
    document.documentElement.className = themeName;
    localStorage.setItem("theme", themeName);
    document.cookie = `theme=${themeName}; path=/; max-age=31536000`;
  }, [currentThemeIndex]);


  if (loading) {
    return (
      // Apply the default/current theme even to the loading screen for consistency
      <div className="flex items-center justify-center min-h-screen bg-bg-color text-text-color">
        {/* Particle background can also be here if desired during loading */}
        <CustomParticlesBackground currentTheme={themes[currentThemeIndex]} />
        <p className="text-2xl font-sharetech animate-pulse relative z-10">Verifying Session...</p>
      </div>
    );
  }

  const currentThemeName = themes[currentThemeIndex];

  if (!token) { // If token is null after loading and verification attempt
    return (
      <PopupProvider>
        <div>
          <CustomParticlesBackground currentTheme={currentThemeName} />
          <main className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10">
          <h1
            className="glitch text-5xl md:text-7xl mb-2 font-vt323 cursor-pointer"
            data-text="BAPTender!"
            onClick={toggleTheme}
          >
            BAPTender!
          </h1>
          <p className="font-sharetech text-sm text-center text-accent-color mb-8">
            A fun, safety-focused group alcohol tracker. Drink responsibly.
          </p>
          <AuthGate onLogin={(newToken) => {
            localStorage.setItem("token", newToken); // Ensure token is set on successful login via AuthGate
            setToken(newToken);
            const pending = localStorage.getItem("pendingInvite");
            if (pending) {
              localStorage.removeItem("pendingInvite");
              router.push(`/invite/${pending}`);
            }
          }} />
          </main>
        </div>
      </PopupProvider>
    );
  }

  // Token is valid, render the authenticated app
// Token is valid, render the authenticated app
return (
  <PopupProvider>
    <BAPTenderProvider token={token}>
      <div>
        <CustomParticlesBackground currentTheme={currentThemeName} />
        <div className="min-h-screen flex flex-col relative z-10">
          <Header onThemeToggle={toggleTheme} currentThemeName={currentThemeName}/>

        {/* 👇 REFACTORED MAIN SECTION 👇 */}
        {/* We make the main container a flex column and apply a single gap to space out its direct children perfectly. */}
        <main className="flex-1 container mx-auto p-4 flex flex-col gap-6">

          {/* This grid now just controls the Graph and Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <div className="themed-card flex flex-col max-h-[var(--max-card-height)] overflow-hidden">
              <h2 className="themed-card-header font-sharetech">Graph of Shame</h2>
              <div className="flex-1">
                <Graph currentThemeName={currentThemeName}/>
              </div>
            </div>
            <div className="themed-card flex flex-col max-h-[var(--max-card-height)] overflow-hidden">
              <h2 className="themed-card-header font-sharetech">Standings</h2>
              <div className="flex-1 overflow-y-auto">
                <UserBACStatusTable/>
              </div>
            </div>
          </div>

          <DrinkTabs/>

        </main>

          <footer
              className="text-center px-4 py-0 font-vt323 text-xs text-accent-color border-t border-t-[var(--card-border-color)]">
          BAPTender - Always verify BAC with a calibrated breathalyzer.
        </footer>
        </div>
      </div>
    </BAPTenderProvider>
  </PopupProvider>
);
}

// Renamed ParticlesBackground to CustomParticlesBackground to avoid naming conflict if any
// Make sure the component file is also named CustomParticlesBackground.tsx
// or adjust the import name here. For this example, I'm assuming you renamed it.
const CustomParticlesBackground = ({ currentTheme }: { currentTheme: string }) => {
  // If ParticlesBackground is in a separate file, ensure it's imported correctly
  // For brevity, I'm not including its full code here again, but it's the
  // working version you confirmed from '@tsparticles/react'.
  if (typeof window !== "undefined") { // Ensure it only renders client-side
    return <ParticlesBackground currentTheme={currentTheme} />;
  }
  return null;
};