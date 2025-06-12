"use client";

import React, { useState } from "react";
import DrinksForm from "./Drinks";
import ManageDrinks from "./ManageDrinks";
export default function DrinkTabs() {
  const [tab, setTab] = useState<"log" | "drinks">("log");
  const tabButton = (key: "log" | "drinks", label: string) => (
    <button
      className={`flex-1 py-1 font-sharetech border-b-2 ${tab === key ? "border-[var(--primary-color)]" : "border-transparent"}`}
      onClick={() => setTab(key)}
    >
      {label}
    </button>
  );

  return (
    <div className="themed-card h-full flex flex-col">
      <div className="flex">{tabButton("log", "Log Drink")}{tabButton("drinks", "Drinks")}</div>
      <div className="flex-1 mt-2">
        {tab === "log" ? <DrinksForm /> : <ManageDrinks />}
      </div>
    </div>
  );
}
