"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const inviteToken = params.token;

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Checking authentication...");

  // Check for existing auth token on mount
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (stored) {
      setAuthToken(stored);
    } else {
      setAuthToken(null);
    }
  }, []);

  // When auth token available, attempt to join group
  useEffect(() => {
    if (!authToken) return;
    const join = async () => {
      setStatus("Joining group...");
      try {
        const res = await fetch(`/api/group/invite/${inviteToken}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStatus(`Joined ${data.name}. Redirecting...`);
          localStorage.removeItem("pendingInvite");
          setTimeout(() => router.push("/"), 1500);
        } else {
          const err = await res.json().catch(() => ({ detail: "Unknown error" }));
          setStatus(`Failed to join: ${err.detail}`);
        }
      } catch (e) {
        setStatus("Network error while joining group.");
      }
    };
    join();
  }, [authToken, inviteToken, router]);

  const handleLogin = (token: string) => {
    localStorage.setItem("token", token);
    setAuthToken(token);
  };

  if (!authToken) {
    // Store invite for later in case user navigates away during login
    if (typeof window !== "undefined") {
      localStorage.setItem("pendingInvite", inviteToken);
    }
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <AuthGate onLogin={handleLogin} />
      </div>
    );
  }

  const showReturn =
    status.startsWith("Failed") || status.toLowerCase().includes("error");

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sharetech">
      <div className="text-center space-y-4">
        <p>{status}</p>
        {showReturn && (
          <button
            onClick={() => router.push("/")}
            className="themed-button font-vt323 text-lg"
          >
            Return to BAPTender
          </button>
        )}
      </div>
    </div>
  );
}
