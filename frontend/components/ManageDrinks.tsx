"use client";

import React, { useEffect, useState } from "react";
import { usePopup } from "@/context/PopupContext";

const EditIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 3.487a2.138 2.138 0 113.02 3.02L9.44 17.95l-4.328.767.767-4.327 10.983-10.903z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 20h14" />
  </svg>
);

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 7h12M10 11v6m4-6v6M9 7V4h6v3m-7 0v12a2 2 0 002 2h4a2 2 0 002-2V7"
    />
  </svg>
);

interface Drink {
  id: string;
  nickname: string | null;
  add_time: string;
  volume: number;
  strength: number;
}

export default function ManageDrinks() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [editing, setEditing] = useState<Drink | null>(null);
  const [form, setForm] = useState<{ nickname: string; volume: string; strength: string }>({
    nickname: "",
    volume: "",
    strength: "",
  });
  const [error, setError] = useState<string | null>(null);
  const { activePopup, setActivePopup } = usePopup();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchDrinks = async () => {
    if (!token) return;
    const res = await fetch("/api/drinks/mine", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setDrinks(data);
    }
  };

  useEffect(() => {
    fetchDrinks();
  }, []);

  useEffect(() => {
    if (activePopup !== "drink-edit") {
      setEditing(null);
    }
  }, [activePopup]);

  const startEdit = (drink: Drink) => {
    setEditing(drink);
    setForm({
      nickname: drink.nickname || "",
      volume: drink.volume.toString(),
      strength: (drink.strength * 100).toString(),
    });
    setActivePopup("drink-edit");
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({ nickname: "", volume: "", strength: "" });
    setActivePopup(null);
  };

  const saveEdit = async () => {
    if (!token) return;
    if (!editing) return;
    const payload = {
      nickname: form.nickname || null,
      volume: parseFloat(form.volume),
      strength: parseFloat(form.strength) / 100,
      add_time: editing.add_time,
    };
    const res = await fetch(`/api/drinks/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await fetchDrinks();
      cancelEdit();
    } else {
      setError("Failed to update drink");
    }
  };

  const removeDrink = async (id: string) => {
    if (!token) return;
    const res = await fetch(`/api/drinks/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      await fetchDrinks();
    } else {
      setError("Failed to remove drink");
    }
  };

  return (
    <div className="relative font-sharetech">
      {error && (
        <p className="text-red-500 text-sm font-sharetech mb-2">{error}</p>
      )}
      <div className="overflow-y-auto max-h-64">
        <table className="themed-table compact-table text-xs" style={{ maxWidth: '400px' }}>
          <thead>
            <tr>
              <th scope="col" className="w-8"></th>
              <th scope="col">Time</th>
              <th scope="col">ML</th>
              <th scope="col">%</th>
              <th scope="col">Title</th>
              <th scope="col" className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {drinks.map((drink) => (
              <tr key={drink.id}>
                <td>
                  <button
                    className="themed-button w-6 h-6 flex items-center justify-center"
                    style={{ padding: 0 }}
                    onClick={() => startEdit(drink)}
                  >
                    <EditIcon />
                  </button>
                </td>
                <td>{new Date(drink.add_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td>{drink.volume}</td>
                <td>{(drink.strength * 100).toFixed(1)}</td>
                <td>{drink.nickname}</td>
                <td>
                  <button
                    className="themed-button-danger w-6 h-6 flex items-center justify-center"
                    style={{ padding: 0 }}
                    onClick={() => removeDrink(drink.id)}
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}
            {drinks.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-2 font-sharetech">
                  No drinks logged.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editing && activePopup === "drink-edit" && (
        <div
          className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-xs sm:absolute sm:top-full sm:left-auto sm:right-0 sm:translate-x-0 sm:translate-y-0 sm:mt-[var(--small-spacing)] sm:w-auto sm:min-w-[300px] sm:max-w-sm themed-card p-[var(--small-spacing)] shadow-2xl overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 2rem)" }}
        >
          <div className="flex justify-between items-center mb-[var(--base-spacing)]">
            <h2 className="font-bold font-vt323" style={{ color: 'var(--accent-color)' }}>
              Edit Drink
            </h2>
            <button onClick={cancelEdit} className="text-sm hover:underline" style={{ color: 'var(--text-color)' }}>
              Close
            </button>
          </div>
          <div className="space-y-[var(--small-spacing)] text-sm">
            <div>
              <label className="block text-xs mb-[var(--tiny-spacing)]" style={{ color: 'var(--accent-color)' }}>
                ML
              </label>
              <input
                type="number"
                className="themed-input text-xs"
                value={form.volume}
                onChange={(e) => setForm({ ...form, volume: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs mb-[var(--tiny-spacing)]" style={{ color: 'var(--accent-color)' }}>
                %
              </label>
              <input
                type="number"
                className="themed-input text-xs"
                value={form.strength}
                onChange={(e) => setForm({ ...form, strength: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs mb-[var(--tiny-spacing)]" style={{ color: 'var(--accent-color)' }}>
                Title
              </label>
              <input
                type="text"
                className="themed-input text-xs"
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              />
            </div>
            <div className="flex justify-between pt-[var(--small-spacing)]">
              <button className="themed-button text-xs py-1 px-2" onClick={saveEdit}>
                Save
              </button>
              <button className="themed-button-danger text-xs py-1 px-2" onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

