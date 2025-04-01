"use client";

import { useState, useEffect } from "react";
import { BAPTenderProvider } from "@/context/BAPTenderContext";
import AuthGate from "@/components/AuthGate";
import Header from "@/components/Header";
import Graph from "@/components/Graph";
import UserBACStatusTable from "@/components/Table";
import DrinksForm from "@/components/Drinks";

export default function HomePage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to fetch token from localStorage on mount
    const storedToken = localStorage.getItem("token");
    if (storedToken) setToken(storedToken);
    setLoading(false);
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }

  // If no token, show AuthGate for login/register
  if (!token) {
    return <AuthGate onLogin={setToken} />;
  }

  // If authenticated, wrap in provider so WS & context can do their magic
  return (
    <BAPTenderProvider token={token}>
      <div className="min-h-screen flex flex-col">
        {/* Header at top */}
        <Header />

        {/* Main content */}
        <main className="flex-1 p-4">
          {/* Graph + Table side by side */}
          <div
            className="flex flex-wrap gap-4 items-stretch"
            style={{ minHeight: "300px" }}
          >
            <div className="flex-1 border rounded p-2 overflow-hidden">
              <Graph />
            </div>
            <div className="flex-1 border rounded p-2 overflow-hidden">
              <UserBACStatusTable />
            </div>
          </div>

          {/* Drinks form below, spanning full width */}
          <div className="mt-4">
            <DrinksForm />
          </div>
        </main>
      </div>
    </BAPTenderProvider>
  );
}
