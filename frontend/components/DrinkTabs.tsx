"use client";

import React, { useState, useRef, useLayoutEffect } from "react";
import DrinksForm from "./Drinks";
import ManageDrinks from "./ManageDrinks";

export default function DrinkTabs() {
  const [tab, setTab] = useState<"log" | "drinks">("log");
  const [cardHeight, setCardHeight] = useState<string | number>('auto');
  const cardRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // Measure the card's total height only when the 'Add Drink' tab is active
    // and a height hasn't been set yet. This captures the height of the tabs + content.
    if (tab === 'log' && cardRef.current && cardHeight === 'auto') {
      setCardHeight(cardRef.current.offsetHeight);
    }
  }, [tab, cardHeight]);

  const tabButton = (key: "log" | "drinks", label: string) => (
    <button
      className={`flex-1 py-1 font-sharetech border-b-2 ${tab === key ? "border-[var(--primary-color)]" : "border-transparent"}`}
      onClick={() => setTab(key)}
    >
      {label}
    </button>
  );

  return (
    <div
      ref={cardRef}
      className="themed-card flex flex-col"
      style={{ height: cardHeight }}
    >
      <div className="flex">
        {tabButton("log", "Add Drink")}
        {tabButton("drinks", "Manage")}
      </div>
      {/* This content area is now a flex item that will grow to fill the remaining space in the card */}
      <div className="flex-1 mt-2 overflow-y-auto">
        {tab === "log" ? <DrinksForm /> : <ManageDrinks />}
      </div>
    </div>
  );
}