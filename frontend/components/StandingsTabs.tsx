"use client";

import React, { useState } from "react";
import UserBACStatusTable from "./Table";
import ManageDrinks from "./ManageDrinks";

export default function StandingsTabs() {
  const [tab, setTab] = useState<"standings" | "drinks">("standings");

  const tabButton = (key: "standings" | "drinks", label: string) => (
    <button
      className={`flex-1 py-1 font-sharetech border-b-2 ${tab === key ? "border-[var(--primary-color)]" : "border-transparent"}`}
      onClick={() => setTab(key)}
    >
      {label}
    </button>
  );

  return (
    <div className="themed-card h-full flex flex-col">
      <div className="flex">{tabButton("standings", "Standings")}{tabButton("drinks", "Drinks")}</div>
      <div className="flex-1 mt-2">
        {tab === "standings" ? <UserBACStatusTable /> : <ManageDrinks />}
      </div>
    </div>
  );
}
