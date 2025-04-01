"use client";

import React, { useState, useEffect } from "react";
import { useBAPTender } from "@/context/BAPTenderContext";

export default function AccountWidget() {
  const { state } = useBAPTender();
  const user = state.self; // assumed to have: displayName, email, weight, gender, height, dob

  const [expanded, setExpanded] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user.displayName || "",
    email: user.email || "",
    weight: user.weight || 0,
    gender: user.gender || "",
    height: user.height || 0,
    dob: user.dob || "",
  });

  // Update formData if user changes
  useEffect(() => {
    setFormData({
      displayName: user.displayName || "",
      email: user.email || "",
      weight: user.weight || 0,
      gender: user.gender || "",
      height: user.height || 0,
      dob: user.dob || "",
    });
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "weight" || name === "height" ? Number(value) : value,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate saving changes (here you could call your API to update details)
    console.log("Saved user data:", formData);
    alert("User details saved (stub)!");
  };

  const handleLogout = () => {
    // Clear token and reload page to log out
    localStorage.removeItem("token");
    window.location.reload();
  };

  return (
    <div className="relative">
      {/* Collapsed view */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700"
      >
        {user.displayName ? `Hey, ${user.displayName}` : "Account"}
      </button>

      {/* Expanded view */}
      {expanded && (
        <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg border rounded p-4 text-black z-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Account Details</h2>
            <button
              onClick={() => setExpanded(false)}
              className="text-sm text-gray-500 hover:text-black"
            >
              Close
            </button>
          </div>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-sm font-medium">
                Display Name
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded p-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                className="mt-1 block w-full border border-gray-300 rounded p-1 bg-gray-100 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                Weight (kg)
              </label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded p-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded p-1"
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="nonbinary">Non-binary</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">
                Height (cm)
              </label>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded p-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                Date of Birth
              </label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded p-1"
              />
            </div>
            <div className="flex justify-between mt-4">
              <button
                type="submit"
                className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
