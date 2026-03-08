"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_GATEWAY_URL || "https://gateway.toolboxlite.com";

interface Usage {
  date: string;
  requests: number;
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;
}

export default function Dashboard() {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Authenticated state
  const [userId, setUserId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [plan, setPlan] = useState("free");
  const [usage, setUsage] = useState<Usage[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("mtg_session");
    if (saved) {
      const s = JSON.parse(saved);
      setUserId(s.userId);
      setApiKey(s.apiKey || s.apiKeys?.[0] || "");
      setApiKeys(s.apiKeys || [s.apiKey]);
      setPlan(s.plan || "free");
    }
  }, []);

  // Fetch usage when apiKey changes
  useEffect(() => {
    if (!apiKey) return;
    fetchUsage();
  }, [apiKey]);

  async function fetchUsage() {
    try {
      const res = await fetch(`${API_BASE}/api/usage/${apiKey}?days=7`);
      const data = await res.json();
      if (data.success) {
        setUsage(data.daily);
        setTotals(data.totals);
      }
    } catch {}
  }

  async function handleAuth() {
    setLoading(true);
    setError("");
    try {
      const endpoint = mode === "register" ? "/api/register" : "/api/login";
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const keys = data.apiKeys || [data.apiKey];
      setUserId(data.userId);
      setApiKey(keys[0]);
      setApiKeys(keys);
      setPlan(data.plan);
      localStorage.setItem("mtg_session", JSON.stringify({ userId: data.userId, apiKey: keys[0], apiKeys: keys, plan: data.plan }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setUserId("");
    setApiKey("");
    setApiKeys([]);
    setUsage([]);
    setTotals(null);
    localStorage.removeItem("mtg_session");
  }

  function copyKey() {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const maxBar = Math.max(...usage.map((u) => u.tokensBefore), 1);

  // --- Not logged in ---
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 block text-center text-xl font-bold"><span className="text-cyan-400">⚡</span> MCP Token Gateway</Link>
          <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-8">
            <div className="mb-6 flex rounded-lg border border-gray-700 p-0.5">
              {(["register", "login"] as const).map((m) => (
                <button key={m} onClick={() => { setMode(m); setError(""); }} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${mode === m ? "bg-cyan-500 text-gray-950" : "text-gray-400 hover:text-white"}`}>
                  {m === "register" ? "Sign Up" : "Log In"}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-400">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAuth()} placeholder="you@example.com"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-400">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAuth()} placeholder="6+ characters"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button onClick={handleAuth} disabled={loading} className="w-full rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-gray-950 hover:bg-cyan-400 transition-all disabled:opacity-50">
                {loading ? "..." : mode === "register" ? "Create Free Account" : "Log In"}
              </button>
            </div>
            <p className="mt-4 text-center text-xs text-gray-500">Free tier: 1,000 calls/day. No credit card.</p>
          </div>
        </div>
      </div>
    );
  }

  // --- Logged in: Dashboard ---
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="text-xl font-bold"><span className="text-cyan-400">⚡</span> MCP Token Gateway</Link>
          <div className="flex items-center gap-4">
            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-400 uppercase">{plan}</span>
            <button onClick={logout} className="text-sm text-gray-400 hover:text-white transition-colors">Logout</button>
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
        {/* API Key */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Your API Key</h2>
          <div className="flex items-center gap-3">
            <code className="flex-1 rounded-lg bg-gray-800 px-4 py-3 font-[family-name:var(--font-mono)] text-sm text-cyan-400 overflow-x-auto">{apiKey}</code>
            <button onClick={copyKey} className="rounded-lg bg-gray-800 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-all shrink-0">
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-3 text-sm text-gray-500">Use this key in your MCP client configuration.</p>
        </div>

        {/* Quick Setup */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Setup</h2>
          <p className="text-sm text-gray-400 mb-3">Replace your MCP server URL with the gateway proxy URL:</p>
          <div className="rounded-lg bg-gray-800 p-4 overflow-x-auto">
            <code className="text-sm font-[family-name:var(--font-mono)] text-gray-300">
              https://gateway.toolboxlite.com/sse/<span className="text-cyan-400">{apiKey}</span>/<span className="text-yellow-400">{"<encoded-mcp-server-url>"}</span>
            </code>
          </div>
          <p className="mt-3 text-xs text-gray-500">Example: to proxy <code className="text-gray-400">https://mcp.github.com/sse</code>, use:<br />
            <code className="text-cyan-400">https://gateway.toolboxlite.com/sse/{apiKey}/https%3A%2F%2Fmcp.github.com%2Fsse</code>
          </p>
        </div>

        {/* Usage Stats */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Token Savings (7 days)</h2>
            <button onClick={fetchUsage} className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">↻ Refresh</button>
          </div>

          {totals && totals.requests > 0 ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
                <div className="rounded-lg bg-gray-800/50 p-4">
                  <div className="text-2xl font-bold text-white">{totals.requests.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Total Requests</div>
                </div>
                <div className="rounded-lg bg-gray-800/50 p-4">
                  <div className="text-2xl font-bold text-white">{totals.tokensBefore.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Tokens Before</div>
                </div>
                <div className="rounded-lg bg-gray-800/50 p-4">
                  <div className="text-2xl font-bold text-cyan-400">{totals.tokensSaved.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Tokens Saved</div>
                </div>
                <div className="rounded-lg bg-cyan-500/10 p-4 border border-cyan-500/20">
                  <div className="text-2xl font-bold text-cyan-400">{totals.savingsPercent}</div>
                  <div className="text-xs text-gray-500">Savings Rate</div>
                </div>
              </div>

              {/* Daily chart */}
              <div className="space-y-2">
                {usage.map((day) => (
                  <div key={day.date} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-gray-500 font-[family-name:var(--font-mono)] shrink-0">{day.date.slice(5)}</div>
                    <div className="flex-1 flex gap-1 h-6 items-center">
                      <div className="h-4 rounded-sm bg-gray-700" style={{ width: `${(day.tokensBefore / maxBar) * 100}%`, minWidth: day.tokensBefore > 0 ? "2px" : "0" }} title={`Before: ${day.tokensBefore}`} />
                      <div className="h-4 rounded-sm bg-cyan-500" style={{ width: `${(day.tokensAfter / maxBar) * 100}%`, minWidth: day.tokensAfter > 0 ? "2px" : "0" }} title={`After: ${day.tokensAfter}`} />
                    </div>
                    <div className="w-16 text-right text-xs text-gray-500">{day.requests} req</div>
                  </div>
                ))}
                <div className="flex items-center gap-4 pt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gray-700" />Before</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-cyan-500" />After</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-gray-400">No usage data yet.</p>
              <p className="text-sm text-gray-500 mt-1">Start proxying MCP requests to see your token savings here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
