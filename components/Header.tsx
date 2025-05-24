"use client";

import React from "react";
import GroupsWidget from "./Groups"; // Assuming this will be styled separately
import AccountWidget from "./Account"; // Assuming this will be styled separately

interface HeaderProps {
  onThemeToggle: () => void;
  currentThemeName: string;
}

export default function Header({ onThemeToggle, currentThemeName }: HeaderProps) {
  return (
    <header className="p-4 shadow-lg" style={{ backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--card-border-color)' }}>
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          {/* Replace with actual logo or styled text */}
          <div
            className="glitch text-3xl cursor-pointer"
            data-text="BAP"
            onClick={onThemeToggle} // Or a dedicated theme button
            title={`Toggle Theme (Current: ${currentThemeName.replace('theme-','')})`}
          >
            BAP
          </div>
          <GroupsWidget />
        </div>

        <div className="flex items-center gap-4">
          {/* Example Theme Toggle Button - can be styled better */}
          <button
            onClick={onThemeToggle}
            className="themed-button text-xs p-2"
            title="Toggle Theme"
          >
            🎨 {currentThemeName.replace('theme-', '')}
          </button>
          <AccountWidget />
        </div>
      </div>
    </header>
  );
}