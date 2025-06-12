"use client";

import { useState } from "react";
import {
  MIN_WEIGHT,
  MAX_WEIGHT,
  MIN_HEIGHT,
  MAX_HEIGHT,
  MIN_AGE,
  MAX_AGE,
} from "@/config";

export default function RegisterForm({
  onLogin,
}: {
  onLogin: (token: string) => void;
}) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    displayName: "",
    weight: "70",
    height: "175",
    gender: "male",
    dob: "",
    realDob: true,
  });
  const [error, setError] = useState<string | null>(null);

function updateField(field: string, value: any) {
  setForm((prev) => ({ ...prev, [field]: value }));
}

function calculateAge(dobString: string): number {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Basic frontend validation (backend has more robust validation)
    if (form.password.length < 3) {
      // Or whatever your backend minimum is
      setError("Password too short, mate.");
      return;
    }
    if (!form.dob) {
      setError("Date of Birth is required, old timer.");
      return;
    }
    if (form.weight === "" || isNaN(parseFloat(form.weight as any))) {
      setError("Please enter a valid weight.");
      return;
    }
    const weightNum = parseFloat(form.weight as any);
    if (weightNum < MIN_WEIGHT || weightNum > MAX_WEIGHT) {
      setError(`Weight must be between ${MIN_WEIGHT} and ${MAX_WEIGHT} kg.`);
      return;
    }
    if (form.height !== "") {
      const heightNum = parseFloat(form.height as any);
      if (isNaN(heightNum)) {
        setError("Please enter a valid height.");
        return;
      }
      if (heightNum < MIN_HEIGHT || heightNum > MAX_HEIGHT) {
        setError(`Height must be between ${MIN_HEIGHT} and ${MAX_HEIGHT} cm.`);
        return;
      }
    }

    const age = calculateAge(form.dob);
    if (age < MIN_AGE || age > MAX_AGE) {
      setError(`Age must be between ${MIN_AGE} and ${MAX_AGE} years.`);
      return;
    }

    try {
      console.log("Registering with form:", form);
      // Convert camelCase fields to snake_case for the API
      const payload = {
        email: form.email,
        password: form.password,
        display_name: form.displayName,
        weight: parseFloat(form.weight as any),
        height:
          form.height === "" ? null : parseFloat(form.height as any),
        gender: form.gender,
        dob: form.dob,
        real_dob: form.realDob,
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(
          `Registration failed: ${errData.detail || "Check your input, sunshine."}`,
        );
        return;
      }

      // CORRECTED URL for login
      const loginRes = await fetch("/api/auth/jwt/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username: form.email,
          password: form.password,
        }),
      });

      if (!loginRes.ok) {
        setError(
          "Registered, but login failed. That's peak British awkwardness.",
        );
        return;
      }

      const loginData = await loginRes.json();
      localStorage.setItem("token", loginData.access_token);
      onLogin(loginData.access_token);
    } catch (err) {
      console.error("Registration error:", err);
      setError("Something went catastrophically wrong. Blame the gremlins.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-[var(--small-spacing)]">
      {" "}
      {/* Adjusted spacing for more fields */}
      <h2
        className="text-2xl font-bold font-vt323 text-center mb-[var(--base-spacing)]"
        style={{ color: "var(--accent-color)" }}
      >
        Enlist in BAPTender
      </h2>
      {/* Email */}
      <div>
        <label
          className="block text-xs font-medium font-sharetech mb-[var(--tiny-spacing)]"
          style={{ color: "var(--accent-color)" }}
        >
          Email
        </label>
        <input
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          className="themed-input text-sm p-[var(--small-spacing)]"
        />
      </div>
      {/* Password */}
      <div>
        <label
          className="block text-xs font-medium font-sharetech mb-[var(--tiny-spacing)]"
          style={{ color: "var(--accent-color)" }}
        >
          Password
        </label>
        <input
          type="password"
          placeholder="Password"
          required
          value={form.password}
          onChange={(e) => updateField("password", e.target.value)}
          className="themed-input text-sm p-[var(--small-spacing)]"
        />
      </div>
      {/* Display Name */}
      <div>
        <label
          className="block text-xs font-medium font-sharetech mb-[var(--tiny-spacing)]"
          style={{ color: "var(--accent-color)" }}
        >
          Display Name
        </label>
        <input
          type="text"
          placeholder="Display Name"
          required
          value={form.displayName}
          onChange={(e) => updateField("displayName", e.target.value)}
          className="themed-input text-sm p-[var(--small-spacing)]"
        />
      </div>
      {/* Weight */}
      <div>
        <label
          className="block text-xs font-medium font-sharetech mb-[var(--tiny-spacing)]"
          style={{ color: "var(--accent-color)" }}
        >
          Weight (kg)
        </label>
        <input
          type="number"
          placeholder="Weight (kg)"
          value={form.weight}
          min={MIN_WEIGHT}
          max={MAX_WEIGHT}
          onChange={(e) =>
            updateField(
              "weight",
              e.target.value === "" ? "" : parseFloat(e.target.value),
            )
          }
          className="themed-input text-sm p-[var(--small-spacing)]"
        />
      </div>
      {/* Height */}
      <div>
        <label
          className="block text-xs font-medium font-sharetech mb-[var(--tiny-spacing)]"
          style={{ color: "var(--accent-color)" }}
        >
          Height (cm)
        </label>
        <input
          type="number"
          placeholder="Height (cm)"
          value={form.height}
          min={MIN_HEIGHT}
          max={MAX_HEIGHT}
          onChange={(e) =>
            updateField(
              "height",
              e.target.value === "" ? "" : parseFloat(e.target.value),
            )
          }
          className="themed-input text-sm p-[var(--small-spacing)]"
        />
      </div>
      {/* Gender */}
      <div>
        <label
          className="block text-xs font-medium font-sharetech mb-[var(--tiny-spacing)]"
          style={{ color: "var(--accent-color)" }}
        >
          Gender
        </label>
        <select
          value={form.gender}
          onChange={(e) => updateField("gender", e.target.value)}
          className="themed-select text-sm p-[var(--small-spacing)]"
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
          {/* Add other options if your backend User schema allows */}
        </select>
      </div>
      {/* DOB */}
      <div>
        <label
          className="block text-xs font-medium font-sharetech mb-[var(--tiny-spacing)]"
          style={{ color: "var(--accent-color)" }}
        >
          Date of Birth
        </label>
        <input
          type="date"
          value={form.dob}
          onChange={(e) => updateField("dob", e.target.value)}
          className="themed-input text-sm p-[var(--small-spacing)]"
          required
        />
      </div>
      {/* Real DOB Checkbox */}
      <div className="flex items-center gap-[var(--small-spacing)]">
        <input
          id="realDob"
          type="checkbox"
          checked={form.realDob}
          onChange={(e) => updateField("realDob", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-[color:var(--primary-color)] focus:ring-[color:var(--primary-color)]"
          style={{ borderColor: "var(--input-border)" }}
        />
        <label
          htmlFor="realDob"
          className="text-xs font-sharetech"
          style={{ color: "var(--text-color)" }}
        >
          This is my real date of birth
        </label>
      </div>
      {error && (
        <p className="text-xs font-sharetech text-red-500 py-1">{error}</p>
      )}
      <button
        type="submit"
        className="themed-button w-full font-vt323 text-lg mt-[var(--small-spacing)]"
      >
        Register & Log In
      </button>
    </form>
  );
}
