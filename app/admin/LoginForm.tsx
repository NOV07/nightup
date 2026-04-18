"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPTS_KEY = "admin_attempts";
const LOCKOUT_KEY = "admin_lockout";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function getLockoutRemaining(): number {
    const until = parseInt(localStorage.getItem(LOCKOUT_KEY) ?? "0", 10);
    return Math.max(0, until - Date.now());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Check lockout before even hitting the server
    const remaining = getLockoutRemaining();
    if (remaining > 0) {
      const mins = Math.ceil(remaining / 60000);
      setError(`Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`);
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    // Clear password from state immediately regardless of outcome
    setPassword("");

    if (res.ok) {
      localStorage.removeItem(ATTEMPTS_KEY);
      localStorage.removeItem(LOCKOUT_KEY);
      router.refresh();
    } else {
      const attempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) ?? "0", 10) + 1;

      if (attempts >= MAX_ATTEMPTS) {
        localStorage.setItem(LOCKOUT_KEY, String(Date.now() + LOCKOUT_MS));
        localStorage.removeItem(ATTEMPTS_KEY);
        setError("Too many failed attempts. Locked out for 15 minutes.");
      } else {
        localStorage.setItem(ATTEMPTS_KEY, String(attempts));
        const left = MAX_ATTEMPTS - attempts;
        setError(`Invalid password. ${left} attempt${left !== 1 ? "s" : ""} remaining.`);
      }

      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0F0F1A" }}>
      <div className="w-full max-w-sm p-8 rounded-2xl" style={{ backgroundColor: "#111120", border: "1px solid rgba(232,160,32,0.12)" }}>
        <h1 className="text-2xl font-bold mb-1 text-center">Nightup Admin</h1>
        <p className="text-gray-400 text-sm text-center mb-8">Enter your password to continue.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            autoFocus
            maxLength={128}
            className="w-full px-4 py-3 rounded-xl text-sm focus-gold"
            style={{ backgroundColor: "#0F0F1A", color: "#fff", border: "1px solid #444", outline: "none" }}
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
          >
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
