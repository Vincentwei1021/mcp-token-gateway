"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

interface Server { id: string; name: string; url: string; }
interface Profile { id: string; name: string; serverIds: string[]; createdAt: string; }

export default function ProfilesPage() {
  const { session, api } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formServerIds, setFormServerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    const [s, p, a] = await Promise.all([
      api("/api/servers"),
      api("/api/profiles"),
      api("/api/active-profile"),
    ]);
    if (s.success) setServers(s.servers);
    if (p.success) setProfiles(p.profiles);
    if (a.success) setActiveProfileId(a.profileId);
  }

  function resetForm() {
    setFormName("");
    setFormServerIds(new Set());
    setShowAdd(false);
    setEditId(null);
  }

  function startEdit(p: Profile) {
    setFormName(p.name);
    setFormServerIds(new Set(p.serverIds));
    setEditId(p.id);
    setShowAdd(true);
  }

  function toggleServer(id: string) {
    const next = new Set(formServerIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setFormServerIds(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const body = { name: formName, serverIds: Array.from(formServerIds) };
    if (editId) {
      await api(`/api/profiles/${editId}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
      await api("/api/profiles", { method: "POST", body: JSON.stringify(body) });
    }
    await refresh();
    resetForm();
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this profile?")) return;
    await api(`/api/profiles/${id}`, { method: "DELETE" });
    await refresh();
  }

  async function handleActivate(profileId: string | null) {
    if (profileId) {
      await api("/api/active-profile", { method: "PUT", body: JSON.stringify({ profileId }) });
    }
    setActiveProfileId(profileId);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Profiles</h1>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-cyan-400">
            + New Profile
          </button>
        )}
      </div>

      {servers.length === 0 && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-400">
          Add servers first before creating profiles. Go to the Servers tab.
        </div>
      )}

      {/* Add/Edit Form */}
      {showAdd && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-cyan-500/30 bg-gray-900/80 p-6 space-y-4">
          <h3 className="font-semibold text-white">{editId ? "Edit Profile" : "New Profile"}</h3>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Profile Name</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} required placeholder='e.g. "Code", "Business", "Research"'
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-2 block text-xs text-gray-400">Select Servers</label>
            {servers.length === 0 ? (
              <p className="text-sm text-gray-500">No servers to select.</p>
            ) : (
              <div className="space-y-2">
                {servers.map((s) => (
                  <label key={s.id} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                    formServerIds.has(s.id) ? "border-cyan-500/50 bg-cyan-500/5" : "border-gray-800 bg-gray-900/50 hover:border-gray-700"
                  }`}>
                    <input type="checkbox" checked={formServerIds.has(s.id)} onChange={() => toggleServer(s.id)}
                      className="rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500" />
                    <div>
                      <div className="text-sm font-medium text-white">{s.name}</div>
                      <div className="text-xs text-gray-500 font-mono truncate">{s.url}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="rounded-lg bg-cyan-500 px-6 py-2 text-sm font-semibold text-gray-950 hover:bg-cyan-400 disabled:opacity-50">
              {loading ? "..." : editId ? "Save" : "Create Profile"}
            </button>
            <button type="button" onClick={resetForm} className="rounded-lg border border-gray-700 px-6 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          </div>
        </form>
      )}

      {/* Profile List */}
      {profiles.length === 0 && !showAdd ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-12 text-center">
          <div className="text-4xl mb-3">📁</div>
          <p className="text-gray-400">No profiles yet.</p>
          <p className="text-sm text-gray-500 mt-1">Create a profile to group servers. Without profiles, all servers are active.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((p) => {
            const isActive = p.id === activeProfileId;
            const serverNames = servers.filter((s) => p.serverIds.includes(s.id)).map((s) => s.name);
            return (
              <div key={p.id} className={`rounded-xl border p-4 ${isActive ? "border-cyan-500/50 bg-cyan-500/5" : "border-gray-800 bg-gray-900/50"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{p.name}</span>
                      {isActive && <span className="rounded-full bg-cyan-500 px-2 py-0.5 text-xs font-bold text-gray-950">ACTIVE</span>}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {serverNames.length > 0 ? serverNames.join(", ") : "No servers selected"}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4 shrink-0">
                    {!isActive && (
                      <button onClick={() => handleActivate(p.id)} className="rounded-lg bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-400 hover:bg-cyan-500/20">Activate</button>
                    )}
                    <button onClick={() => startEdit(p)} className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-400 hover:text-white">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-red-400 hover:text-red-300">Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
