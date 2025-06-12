"use client";

import React, { useState, useEffect } from "react";
import { useBAPTender } from "@/context/BAPTenderContext";
import { calculateDrinkBAC, calculateCurrentBAC } from "@/utils/bac";

export default function DrinksForm() {
  const [volume, setVolume] = useState("");
  const [strength, setStrength] = useState("");
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bacAdd, setBacAdd] = useState<number | null>(null);
  const [bacTotal, setBacTotal] = useState<number | null>(null);

  const { state } = useBAPTender();

  useEffect(() => {
    const vol = Number(volume);
    const str = Number(strength);
    if (isNaN(vol) || vol <= 0 || isNaN(str) || str <= 0) {
      setBacAdd(null);
      setBacTotal(null);
      return;
    }
    const user = state.self;
    if (!user || user.weight <= 0) {
      setBacAdd(null);
      setBacTotal(null);
      return;
    }
    const age = user.dob
      ? (Date.now() - new Date(user.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      : undefined;
    const add = calculateDrinkBAC(
      vol,
      str / 100,
      user.weight,
      user.gender,
      age,
      user.height,
    );
    const current = calculateCurrentBAC(state.states[user.id]);
    setBacAdd(add);
    setBacTotal(current + add);
  }, [volume, strength, state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    console.log(
      "Preparing to log drink. Current token from localStorage:",
      localStorage.getItem("token"),
    ); // For debugging

    if (!volume || !strength) {
      setError("Volume and Strength are required, you reprobate.");
      return;
    }
    const vol = Number(volume);
    const strengthPercent = Number(strength);

    if (
      isNaN(vol) ||
      vol <= 0 ||
      isNaN(strengthPercent) ||
      strengthPercent <= 0
    ) {
      setError(
        "Enter valid, positive numbers for Volume and Strength, genius.",
      );
      return;
    }
    const strengthDecimal = strengthPercent / 100;
    const payload = {
      nickname: nickname || "Mystery Brew",
      add_time: new Date().toISOString(),
      volume: vol,
      strength: strengthDecimal,
    };

    const token = localStorage.getItem("token");
    // console.log("DrinksForm: Token being sent:", token); // Debug log

    if (!token) {
      setError("Authentication token is missing. Please log in again.");
      return;
    }

    try {
      // CORRECTED URL: Use /api/ (matching next.config.js source)
      // AND ensure trailing slash to match FastAPI endpoint structure
      const res = await fetch("/api/drinks/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Ensure space after Bearer
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        setError(
          "Authorization failed. Your session might have expired. Please log in again.",
        );
        // localStorage.removeItem("token"); // Optional: clear bad token
        // window.location.reload();
        return;
      }

      // No need to specifically handle 307 on client if we avoid it.
      // Server should ideally not redirect POSTs if client calls correctly.

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({
          detail: `Request failed with status ${res.status}. Unable to parse error response.`,
        }));
        setError(
          `Error: ${errorData.detail || `Request failed with status ${res.status}`}`,
        );
        return;
      }

      setMessage("Drink logged! Ready for another, champ?");
      setVolume("");
      setStrength("");
      setNickname("");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error("Error logging drink:", err);
      setError("Network hiccup or a gremlin in the machine. Try again.");
    }
  };

  return (
    // The parent div in app/page.tsx already has .themed-card
    <form
      onSubmit={handleSubmit}
      className="space-y-[var(--base-spacing)] mt-[var(--large-spacing)]"
    >
      <div>
        <label
          htmlFor="drinkVolume"
          className="block text-sm font-medium font-sharetech mb-[var(--tiny-spacing)]"
          style={{ color: "var(--accent-color)" }}
        >
          Volume (ml)
        </label>
        <input
          id="drinkVolume"
          type="number"
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          className="themed-input"
          placeholder="e.g., 330"
        />
      </div>
      <div>
        <label
          htmlFor="drinkStrength"
          className="block text-sm font-medium font-sharetech mb-[var(--tiny-spacing)]"
          style={{ color: "var(--accent-color)" }}
        >
          Strength (% ABV)
        </label>
        <input
          id="drinkStrength"
          type="number"
          step="0.1"
          value={strength}
          onChange={(e) => setStrength(e.target.value)}
          className="themed-input"
          placeholder="e.g., 5.5"
        />
      </div>
      <div>
        <label
          htmlFor="drinkNickname"
          className="block text-sm font-medium font-sharetech mb-[var(--tiny-spacing)]"
          style={{ color: "var(--accent-color)" }}
        >
          Nickname (optional, e.g., &quot;Rocket Fuel&quot;)
        </label>
        <input
          id="drinkNickname"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="themed-input"
          placeholder="Your liver's nemesis"
        />
      </div>
      {bacAdd !== null && (
        <p
          className="text-sm font-sharetech"
          style={{ color: "var(--accent-color)" }}
        >
          BAC impact: +{bacAdd.toFixed(3)}% (new BAC {(bacTotal ?? 0).toFixed(3)}%)
        </p>
      )}
      <button type="submit" className="themed-button w-full font-vt323 text-lg">
        Log Drink
      </button>
      {message && (
        <p
          className="mt-[var(--small-spacing)] text-sm font-sharetech"
          style={{ color: "var(--primary-color)" }}
        >
          {message}
        </p>
      )}
      {error && (
        <p className="mt-[var(--small-spacing)] text-sm font-sharetech text-red-500">
          {error}
        </p>
      )}
    </form>
  );
}
