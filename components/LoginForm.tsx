"use client";

import { useState } from "react";

export default function LoginForm({
  onLogin,
}: {
  onLogin: (token: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      // CORRECTED URL
      const res = await fetch("/api/auth/jwt/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });

      if (!res.ok) {
        setError("Login failed. Check your email and password.");
        return;
      }

      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      onLogin(data.access_token);
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went terribly wrong, as usual.");
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-[var(--base-spacing)]">
      <h2
        className="text-2xl font-bold font-vt323 text-center mb-[var(--base-spacing)]"
        style={{ color: "var(--accent-color)" }}
      >
        Access Terminal
      </h2>
      <div>
        <label
          htmlFor="loginEmail"
          className="block text-sm font-medium font-sharetech mb-[var(--tiny-spacing)]"
          style={{ color: "var(--accent-color)" }}
        >
          Email
        </label>
        <input
          id="loginEmail"
          type="email"
          placeholder="your.soul@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="themed-input"
        />
      </div>
      <div>
        <label
          htmlFor="loginPassword"
          className="block text-sm font-medium font-sharetech mb-[var(--tiny-spacing)]"
          style={{ color: "var(--accent-color)" }}
        >
          Password
        </label>
        <input
          id="loginPassword"
          type="password"
          placeholder="SuperSecretPassword123!"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="themed-input"
        />
      </div>
      {error && <p className="text-sm font-sharetech text-red-500">{error}</p>}
      <button type="submit" className="themed-button w-full font-vt323 text-lg">
        Login
      </button>
    </form>
  );
}
