"use client";

import React, { useState } from "react";

export default function DrinksForm() {
  const [volume, setVolume] = useState("");
  const [strength, setStrength] = useState("");
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    // Validate required fields
    if (!volume || !strength) {
      setError("Volume and Strength are required.");
      return;
    }

    const vol = Number(volume);
    const strengthPercent = Number(strength);

    if (isNaN(vol) || isNaN(strengthPercent)) {
      setError("Please enter valid numbers for Volume and Strength.");
      return;
    }

    // Convert strength percent to decimal
    const strengthDecimal = strengthPercent / 100;

    const payload = {
      nickname: nickname || "",
      add_time: new Date().toISOString(),
      volume: vol,
      strength: strengthDecimal,
    };

    console.log("Submitting payload:", payload);

    try {
      // Get token from localStorage (or pass it in as a prop if needed)
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/drinks/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError("Error: " + (errorData.detail || "Unknown error"));
      } else {
        setMessage("Drink logged successfully!");
        setVolume("");
        setStrength("");
        setNickname("");
      }
    } catch (err) {
      console.error("Error logging drink:", err);
      setError("Error logging drink.");
    }
  };

  return (
    <div className="p-4 border rounded shadow-sm max-w-md">
      <h2 className="text-xl font-bold mb-4">Log a Drink</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Volume (ml)</label>
          <input
            type="number"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded p-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">
            Strength (% ABV)
          </label>
          <input
            type="number"
            value={strength}
            onChange={(e) => setStrength(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded p-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">
            Nickname (optional)
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded p-2"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Log Drink
        </button>
        {message && <p className="text-green-600">{message}</p>}
        {error && <p className="text-red-600">{error}</p>}
      </form>
    </div>
  );
}
