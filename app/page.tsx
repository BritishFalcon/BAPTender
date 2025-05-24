"use client";

import { useState, useEffect } from "react";
import { BAPTenderProvider } from "@/context/BAPTenderContext";
import AuthGate from "@/components/AuthGate";
import Header from "@/components/Header";
import Graph from "@/components/Graph";
import UserBACStatusTable from "@/components/Table";
import DrinksForm from "@/components/Drinks";
import ParticlesBackground from "@/components/ParticlesBackground"; // Import

const themes = ['theme-og', 'theme-dark', 'theme-cyber', 'theme-neon'];

export default function HomePage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) setToken(storedToken);
    setLoading(false);

    // Apply initial theme to HTML element
    document.documentElement.className = themes[currentThemeIndex];
  }, []); // Run once on mount

  const toggleTheme = () => {
    const nextThemeIndex = (currentThemeIndex + 1) % themes.length;
    setCurrentThemeIndex(nextThemeIndex);
    document.documentElement.className = themes[nextThemeIndex]; // Apply to <html>
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-color text-text-color">
        <p className="text-2xl font-sharetech animate-pulse">Initializing BAPTender Interface...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className={`theme-${themes[currentThemeIndex]}`}>
        <div id="particles-js-container">
          <ParticlesBackground currentTheme={themes[currentThemeIndex]} />
        </div>
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
          <AuthGate onLogin={setToken} />
        </main>
      </div>
    );
  }

  return (
    <BAPTenderProvider token={token}>
      <div className={`theme-${themes[currentThemeIndex]}`}>
        <div id="particles-js-container">
           <ParticlesBackground currentTheme={themes[currentThemeIndex]} />
        </div>
        <div className="min-h-screen flex flex-col relative z-10">
          <Header onThemeToggle={toggleTheme} currentThemeName={themes[currentThemeIndex]} />

          <main className="flex-1 container mx-auto p-4 space-y-var(--golden-spacing)">
            {/* Main Title (only if not in header) */}
            {/* You might want the title in the header instead for authenticated view */}
            {/* <div className="text-center my-var(--base-spacing)">
              <h1
                className="glitch text-5xl md:text-7xl mb-2 font-vt323 cursor-pointer"
                data-text="BAPTender!"
                onClick={toggleTheme}
              >
                BAPTender!
              </h1>
              <p className="font-sharetech text-sm text-accent-color">
                Current Theme: {themes[currentThemeIndex].replace('theme-', '')}
              </p>
            </div>
            */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-var(--golden-spacing) items-stretch">
              <div className="themed-card">
                <h2 className="themed-card-header font-sharetech">Graph of Shame</h2>
                <Graph />
              </div>
              <div className="themed-card">
                <h2 className="themed-card-header font-sharetech">Standings (Future Blackouts)</h2>
                <UserBACStatusTable />
              </div>
            </div>

            <div className="themed-card">
              <h2 className="themed-card-header font-sharetech">Log a Drink (You Lush)</h2>
              <DrinksForm />
            </div>
          </main>

          <footer className="text-center p-var(--small-spacing) font-vt323 text-xs text-accent-color border-t border-t-[var(--card-border-color)]">
            BAPTender - Always verify BAC with a calibrated breathalyzer. This is for fun.
          </footer>
        </div>
      </div>
    </BAPTenderProvider>
  );
}