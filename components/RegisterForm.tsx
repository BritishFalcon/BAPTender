"use client";

import { useState } from "react";

export default function RegisterForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    display_name: "",
    weight: 70,
    height: 175,
    gender: "male",
    dob: "",
    real_dob: true,
  });

  const [error, setError] = useState<string | null>(null);

  function updateField(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      console.log("Registering with form:", form);
      const res = await fetch("http://localhost:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        setError("Registration failed. Check your input.");
        return;
      }

      const loginRes = await fetch("http://localhost:8000/auth/jwt/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username: form.email,
          password: form.password,
        }),
      });

      if (!loginRes.ok) {
        setError("Registered, but login failed. That's awkward.");
        return;
      }

      const loginData = await loginRes.json();
      localStorage.setItem("token", loginData.access_token);
      onLogin(loginData.access_token);
    } catch (err) {
      console.error("Registration error:", err);
      setError("Something went wrong.");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Register</h2>

      <input
        type="email"
        placeholder="Email"
        required
        value={form.email}
        onChange={(e) => updateField("email", e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        required
        value={form.password}
        onChange={(e) => updateField("password", e.target.value)}
      />

      <input
        type="text"
        placeholder="Display Name"
        required
        value={form.display_name}
        onChange={(e) => updateField("display_name", e.target.value)}
      />

      <input
        type="number"
        placeholder="Weight (kg)"
        value={form.weight}
        onChange={(e) => updateField("weight", parseFloat(e.target.value))}
      />

      <input
        type="number"
        placeholder="Height (cm)"
        value={form.height}
        onChange={(e) => updateField("height", parseFloat(e.target.value))}
      />

      <select
        value={form.gender}
        onChange={(e) => updateField("gender", e.target.value)}
      >
        <option value="Male">Male</option>
        <option value="Female">Female</option>
      </select>

      <input
        type="date"
        value={form.dob}
        onChange={(e) => updateField("dob", e.target.value)}
      />

      <label>
        <input
          type="checkbox"
          checked={form.real_dob}
          onChange={(e) => updateField("real_dob", e.target.checked)}
        />
        This is my real date of birth
      </label>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button type="submit">Register & Log In</button>
    </form>
  );
}
