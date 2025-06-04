"use client";

import { useState } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

export default function AuthGate({
  onLogin,
}: {
  onLogin: (token: string) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    // Centering is handled by parent in app/page.tsx
    <div className="themed-card w-full max-w-md mx-auto">
      {mode === "login" ? (
        <>
          <LoginForm onLogin={onLogin} />
          <p className="mt-[var(--base-spacing)] text-center text-sm font-sharetech">
            No account, comrade?{" "}
            <button
              onClick={() => setMode("register")}
              className="font-bold hover:underline"
              style={{ color: "var(--primary-color)" }}
            >
              Register here
            </button>
          </p>
        </>
      ) : (
        <>
          <RegisterForm onLogin={onLogin} />
          <p className="mt-[var(--base-spacing)] text-center text-sm font-sharetech">
            Already in the system?{" "}
            <button
              onClick={() => setMode("login")}
              className="font-bold hover:underline"
              style={{ color: "var(--primary-color)" }}
            >
              Log in
            </button>
          </p>
        </>
      )}
    </div>
  );
}
