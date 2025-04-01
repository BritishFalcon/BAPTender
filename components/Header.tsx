"use client";

import React from "react";
import GroupsWidget from "./Groups";

export default function Header() {
  return (
    <header className="flex justify-between items-center p-4 bg-gray-900 text-white">
      {/* Left side: Logo and Groups Widget */}
      <div className="flex items-center gap-4">
        <img
          src="/placeholder-logo.png"
          alt="Logo"
          className="w-10 h-10 object-contain"
        />
        <GroupsWidget />
      </div>

      {/* Right side: Account Widget Placeholder */}
      <div>
        <div className="bg-gray-800 px-3 py-2 rounded hover:bg-gray-700 cursor-pointer">
          Account
        </div>
      </div>
    </header>
  );
}
