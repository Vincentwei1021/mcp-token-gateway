"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>;
  if (session) return <>{children}</>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (mode === "register") await register(email, password);
      else await login(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-xl font-bold"><span className="text-cyan-400">⚡</span> MCP Control Plane</div>
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-800 bg-gray-900/80 p-8 space-y-4">
          <div className="flex rounded-lg border border-gray-700 p-0.5 mb-2">
            {(["register", "login"] as const).map((m) => (
              <button type="button" key={m} onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${mode === m ? "bg-cyan-500 text-gray-950" : "text-gray-400 hover:text-white"}`}>
                {m === "register" ? "Sign Up" : "Log In"}
              </button>
            ))}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-400">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-400">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="6+ characters"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={submitting}
            className="w-full rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-gray-950 hover:bg-cyan-400 disabled:opacity-50 transition-all">
            {submitting ? "..." : mode === "register" ? "Create Free Account" : "Log In"}
          </button>
          <p className="text-center text-xs text-gray-500">Free tier: unlimited servers, 1,000 calls/day.</p>
        </form>
      </div>
    </div>
  );
}
