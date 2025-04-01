"use client";

import { useState } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

// TODO: Verify the token rather than assuming it's valid

export default function AuthGate({ onLogin }: { onLogin: (token: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: "400px" }}>
        {mode === "login" ? (
          <>
            <LoginForm onLogin={onLogin} />
            <p>
              No account?{" "}
              <button onClick={() => setMode("register")}>Register here</button>
            </p>
          </>
        ) : (
          <>
            <RegisterForm onLogin={onLogin} />
            <p>
              Already registered?{" "}
              <button onClick={() => setMode("login")}>Log in</button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
