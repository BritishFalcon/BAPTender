"use client";

import { useState } from "react";

export default function RegisterForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    display_name: "",
    weight: 70,
    height: 175,
    gender: "male", // Ensure this matches one of your backend's accepted normalized values
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

    // Basic frontend validation (backend has more robust validation)
    if (form.password.length < 3) { // Or whatever your backend minimum is
        setError("Password too short, mate.");
        return;
    }
    if (!form.dob) {
        setError("Date of Birth is required, old timer.");
        return;
    }


    try {
      console.log("Registering with form:", form);
      // CORRECTED URL for register
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(`Registration failed: ${errData.detail || "Check your input, sunshine."}`);
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
        setError("Registered, but login failed. That's peak British awkwardness.");
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
    <form onSubmit={handleSubmit} className="space-y-var(--small-spacing)"> {/* Adjusted spacing for more fields */}
      <h2 className="text-2xl font-bold font-vt323 text-center mb-var(--base-spacing)" style={{color: 'var(--accent-color)'}}>
        Enlist in BAPTender
      </h2>

      {/* Email */}
      <div>
        <label className="block text-xs font-medium font-sharetech mb-0.5" style={{color: 'var(--accent-color)'}}>Email</label>
        <input type="email" placeholder="Email" required value={form.email} onChange={(e) => updateField("email", e.target.value)} className="themed-input text-sm p-2"/>
      </div>
      {/* Password */}
      <div>
        <label className="block text-xs font-medium font-sharetech mb-0.5" style={{color: 'var(--accent-color)'}}>Password</label>
        <input type="password" placeholder="Password" required value={form.password} onChange={(e) => updateField("password", e.target.value)} className="themed-input text-sm p-2"/>
      </div>
      {/* Display Name */}
      <div>
        <label className="block text-xs font-medium font-sharetech mb-0.5" style={{color: 'var(--accent-color)'}}>Display Name</label>
        <input type="text" placeholder="Display Name" required value={form.display_name} onChange={(e) => updateField("display_name", e.target.value)} className="themed-input text-sm p-2"/>
      </div>
      {/* Weight */}
      <div>
        <label className="block text-xs font-medium font-sharetech mb-0.5" style={{color: 'var(--accent-color)'}}>Weight (kg)</label>
        <input type="number" placeholder="Weight (kg)" value={form.weight} onChange={(e) => updateField("weight", parseFloat(e.target.value) || 0)} className="themed-input text-sm p-2"/>
      </div>
      {/* Height */}
      <div>
        <label className="block text-xs font-medium font-sharetech mb-0.5" style={{color: 'var(--accent-color)'}}>Height (cm)</label>
        <input type="number" placeholder="Height (cm)" value={form.height} onChange={(e) => updateField("height", parseFloat(e.target.value) || 0)} className="themed-input text-sm p-2"/>
      </div>
      {/* Gender */}
      <div>
        <label className="block text-xs font-medium font-sharetech mb-0.5" style={{color: 'var(--accent-color)'}}>Gender</label>
        <select value={form.gender} onChange={(e) => updateField("gender", e.target.value)} className="themed-select text-sm p-2">
          <option value="male">Male</option>
          <option value="female">Female</option>
          {/* Add other options if your backend User schema allows */}
        </select>
      </div>
      {/* DOB */}
      <div>
        <label className="block text-xs font-medium font-sharetech mb-0.5" style={{color: 'var(--accent-color)'}}>Date of Birth</label>
        <input type="date" value={form.dob} onChange={(e) => updateField("dob", e.target.value)} className="themed-input text-sm p-2" required />
      </div>
      {/* Real DOB Checkbox */}
      <div className="flex items-center gap-2">
        <input id="real_dob" type="checkbox" checked={form.real_dob} onChange={(e) => updateField("real_dob", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[color:var(--primary-color)] focus:ring-[color:var(--primary-color)]" style={{borderColor: 'var(--input-border)'}}/>
        <label htmlFor="real_dob" className="text-xs font-sharetech" style={{color: 'var(--text-color)'}}>This is my real date of birth</label>
      </div>

      {error && <p className="text-xs font-sharetech text-red-500 py-1">{error}</p>}
      <button type="submit" className="themed-button w-full font-vt323 text-lg mt-var(--small-spacing)">Register & Log In</button>
    </form>
  );
}