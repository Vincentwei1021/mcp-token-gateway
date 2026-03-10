"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const API = process.env.NEXT_PUBLIC_GATEWAY_URL || "https://gateway.toolboxlite.com";

interface Session {
  userId: string;
  email: string;
  apiKey: string;
  apiKeys: string[];
  plan: string;
}

interface AuthCtx {
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  api: (path: string, opts?: RequestInit) => Promise<any>;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("mtg_session");
    if (saved) {
      try { setSession(JSON.parse(saved)); } catch {}
    }
    setLoading(false);
  }, []);

  async function doAuth(endpoint: string, email: string, password: string) {
    const res = await fetch(`${API}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const s: Session = {
      userId: data.userId,
      email: data.email,
      apiKey: data.apiKey || data.apiKeys?.[0],
      apiKeys: data.apiKeys || [data.apiKey],
      plan: data.plan,
    };
    localStorage.setItem("mtg_session", JSON.stringify(s));
    setSession(s);
  }

  async function api(path: string, opts: RequestInit = {}) {
    if (!session) throw new Error("Not authenticated");
    const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${session.apiKey}`, ...(opts.headers as Record<string, string> || {}) };
    const res = await fetch(`${API}${path}`, { ...opts, headers });
    return res.json();
  }

  return (
    <AuthContext.Provider value={{
      session, loading,
      login: (e, p) => doAuth("/api/login", e, p),
      register: (e, p) => doAuth("/api/register", e, p),
      logout: () => { localStorage.removeItem("mtg_session"); setSession(null); },
      api,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
