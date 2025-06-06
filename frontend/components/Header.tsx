"use client";

import React from "react";
import GroupsWidget from "./Groups"; // Assuming this will be styled separately
import AccountWidget from "./Account"; // Assuming this will be styled separately
import useWindowWidth from "@/hooks/useWindowWidth";

interface HeaderProps {
  onThemeToggle: () => void;
  currentThemeName: string;
}

export default function Header({
  onThemeToggle,
  currentThemeName,
}: HeaderProps) {
  const windowWidth = useWindowWidth();
  const logoClass =
    windowWidth < 320
      ? "text-xl"
      : windowWidth < 360
      ? "text-2xl"
      : windowWidth < 420
      ? "text-3xl"
      : "text-4xl";
  return (
    <header
      className="p-[var(--base-spacing)] shadow-lg"
      style={{
        backgroundColor: "var(--card-bg)",
        borderBottom: "1px solid var(--card-border-color)",
      }}
    >
      <div className="container mx-auto flex justify-between items-center">
        {/* CHILD 1: Left Aligned Wrapper */}
        {/* flex-1 makes it take up 1/3 of the space. justify-start aligns the content inside it to the left. */}
        <div className="flex-1 flex justify-start">
          <GroupsWidget />
        </div>

        {/* CHILD 2: Centered */}
        {/* This div is just for the logo itself. It won't grow or shrink. */}
        <div className="flex-shrink-0">
          <div
            className={`${logoClass} cursor-pointer`}
            data-text="BAPTENDER"
            onClick={onThemeToggle}
            title={`Toggle Theme (Current: ${currentThemeName.replace("theme-", "")})`}
          >
            BAPTENDER
          </div>
        </div>

        {/* CHILD 3: Right Aligned Wrapper */}
        {/* flex-1 again to take up equal space. justify-end aligns the content inside it to the right. */}
        <div className="flex-1 flex justify-end">
          <AccountWidget />
        </div>
      </div>
    </header>
  );
}
