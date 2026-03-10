"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

interface Server {
  id: string;
  name: string;
  url: string;
  transport: string;
  authType: string;
  authValue?: string;
  authHeader?: string;
  createdAt: string;
}

export default function ServersPage() {
  const { api } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", url: "", transport: "sse", authType: "none", authValue: "", authHeader: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    const d = await api("/api/servers");
    if (d.success) setServers(d.servers);
  }

  function resetForm() {
    setForm({ name: "", url: "", transport: "sse", authType: "none", authValue: "", authHeader: "" });
    setShowAdd(false);
    setEditId(null);
    setError("");
  }

  function startEdit(s: Server) {
    setForm({ name: s.name, url: s.url, transport: s.transport, authType: s.authType, authValue: s.authValue || "", authHeader: s.authHeader || "" });
    setEditId(s.id);
    setShowAdd(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (editId) {
        await api(`/api/servers/${editId}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await api("/api/servers", { method: "POST", body: JSON.stringify(form) });
      }
      await refresh();
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this server?")) return;
    await api(`/api/servers/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">MCP Servers</h1>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-cyan-400">
            + Add Server
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAdd && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-cyan-500/30 bg-gray-900/80 p-6 space-y-4">
          <h3 className="font-semibold text-white">{editId ? "Edit Server" : "Add MCP Server"}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. GitHub MCP"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">URL</label>
              <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required placeholder="https://mcp-server.example.com/sse"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Transport</label>
              <select value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none">
                <option value="sse">SSE</option>
                <option value="http">HTTP</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Auth Type</label>
              <select value={form.authType} onChange={(e) => setForm({ ...form, authType: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none">
                <option value="none">None</option>
                <option value="bearer">Bearer Token</option>
                <option value="header">Custom Header</option>
              </select>
            </div>
            {form.authType !== "none" && (
              <>
                {form.authType === "header" && (
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Header Name</label>
                    <input value={form.authHeader} onChange={(e) => setForm({ ...form, authHeader: e.target.value })} placeholder="X-API-Key"
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs text-gray-400">{form.authType === "bearer" ? "Token" : "Value"}</label>
                  <input type="password" value={form.authValue} onChange={(e) => setForm({ ...form, authValue: e.target.value })} placeholder="••••••••"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" />
                </div>
              </>
            )}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="rounded-lg bg-cyan-500 px-6 py-2 text-sm font-semibold text-gray-950 hover:bg-cyan-400 disabled:opacity-50">
              {loading ? "..." : editId ? "Save" : "Add Server"}
            </button>
            <button type="button" onClick={resetForm} className="rounded-lg border border-gray-700 px-6 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          </div>
        </form>
      )}

      {/* Server List */}
      {servers.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-12 text-center">
          <div className="text-4xl mb-3">🖥️</div>
          <p className="text-gray-400">No servers yet.</p>
          <p className="text-sm text-gray-500 mt-1">Add your first MCP server to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((s) => (
            <div key={s.id} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{s.name}</span>
                  <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-500 uppercase">{s.transport}</span>
                  {s.authType !== "none" && <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-400">🔒 {s.authType}</span>}
                </div>
                <div className="mt-1 text-sm text-gray-500 truncate font-mono">{s.url}</div>
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <button onClick={() => startEdit(s)} className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-400 hover:text-white">Edit</button>
                <button onClick={() => handleDelete(s.id)} className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-red-400 hover:text-red-300">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
