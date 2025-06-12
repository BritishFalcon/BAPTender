"use client";

import React, { useEffect, useState } from "react";

interface Drink {
  id: string;
  nickname: string | null;
  add_time: string;
  volume: number;
  strength: number;
}

export default function ManageDrinks() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<{ nickname: string; volume: string; strength: string }>({
    nickname: "",
    volume: "",
    strength: "",
  });
  const [error, setError] = useState<string | null>(null);

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

  const startEdit = (drink: Drink) => {
    setEditing(drink.id);
    setForm({
      nickname: drink.nickname || "",
      volume: drink.volume.toString(),
      strength: (drink.strength * 100).toString(),
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({ nickname: "", volume: "", strength: "" });
  };

  const saveEdit = async (id: string) => {
    if (!token) return;
    const payload = {
      nickname: form.nickname || null,
      volume: parseFloat(form.volume),
      strength: parseFloat(form.strength) / 100,
      add_time: drinks.find((d) => d.id === id)?.add_time || new Date().toISOString(),
    };
    const res = await fetch(`/api/drinks/${id}`, {
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
    <div>
      {error && (
        <p className="text-red-500 text-sm font-sharetech mb-2">{error}</p>
      )}
      <div className="overflow-y-auto max-h-64">
        <table className="themed-table">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Volume (ml)</th>
              <th scope="col">Strength (%)</th>
              <th scope="col">Title</th>
              <th scope="col" className="w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {drinks.map((drink) => (
              <tr key={drink.id}>
                {editing === drink.id ? (
                  <>
                    <td>{new Date(drink.add_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    <td>
                      <input
                        type="number"
                        className="themed-input w-20"
                        value={form.volume}
                        onChange={(e) => setForm({ ...form, volume: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="themed-input w-20"
                        value={form.strength}
                        onChange={(e) => setForm({ ...form, strength: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="themed-input"
                        value={form.nickname}
                        onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                      />
                    </td>
                    <td className="flex gap-1">
                      <button className="themed-button px-2" onClick={() => saveEdit(drink.id)}>
                        Save
                      </button>
                      <button className="themed-button-danger px-2" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{new Date(drink.add_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    <td>{drink.volume}</td>
                    <td>{(drink.strength * 100).toFixed(1)}</td>
                    <td>{drink.nickname}</td>
                    <td className="flex gap-1">
                      <button className="themed-button px-2" onClick={() => startEdit(drink)}>
                        Edit
                      </button>
                      <button className="themed-button-danger px-2" onClick={() => removeDrink(drink.id)}>
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {drinks.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-2 font-sharetech">
                  No drinks logged.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

