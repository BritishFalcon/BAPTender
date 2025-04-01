"use client";

import { useState, useEffect } from "react";
import { BAPTenderProvider, useBAPTender } from "@/context/BAPTenderContext";
import Graph from "@/components/Graph";

// A simple component to show the context data on screen
function BAPTenderDebugger() {
  const { state, rawMessage } = useBAPTender();

  return (
    <div>
      <h2>Provider Debugger</h2>
      <div>
        <h3>Raw WS Message</h3>
        <pre style={{ background: "#333", color: "#fff", padding: "1rem" }}>
          {rawMessage || "No message received yet"}
        </pre>
      </div>
      <div>
        <h3>Formatted State from Context</h3>
        <pre style={{ background: "#333", color: "#fff", padding: "1rem" }}>
          {JSON.stringify(state, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default function DummyPage() {
  const [token, setToken] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    async function login() {
      try {
        // Use absolute URL if needed; adjust the port/host to match your backend.
        const res = await fetch("http://localhost:8000/auth/jwt/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            username: "b.griffiths2002@gmail.com",
            password: "password",
          }),
        });

        if (!res.ok) {
          setLoginError("Login failed: " + res.statusText);
          return;
        }

        const data = await res.json();
        console.log("Token acquired:", data.access_token);
        setToken(data.access_token);
      } catch (err) {
        console.error("Login error:", err);
        setLoginError("Login error occurred");
      }
    }
    login();
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Dummy Test Page for WebSocket Authentication</h1>
      <section>
        <h2>Login Status</h2>
        {loginError ? (
          <p style={{ color: "red" }}>{loginError}</p>
        ) : token ? (
          <>
            <h3>JWT Token:</h3>
            <pre style={{ background: "#333", color: "#fff", padding: "1rem" }}>
              {token}
            </pre>
          </>
        ) : (
          <p>Logging in...</p>
        )}
      </section>

      {token && (
        <BAPTenderProvider token={token}>
          {/* Existing debug info */}
          <BAPTenderDebugger />
          {/* New graph addition */}
          <Graph />
        </BAPTenderProvider>
      )}
    </div>
  );
}
