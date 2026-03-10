"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function DashboardOverview() {
  const { session, api } = useAuth();
  const [servers, setServers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!session) return;
    api("/api/servers").then((d) => d.success && setServers(d.servers));
    api("/api/profiles").then((d) => d.success && setProfiles(d.profiles));
    api("/api/active-profile").then((d) => d.success && setActiveProfileId(d.profileId));
  }, [session]);

  function copyKey() {
    if (!session) return;
    navigator.clipboard.writeText(session.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const gatewayUrl = `https://gateway.toolboxlite.com/gw/${session?.apiKey}`;
  const activeProfile = profiles.find((p: any) => p.id === activeProfileId);

  return (
    <div className="space-y-6">
      {/* API Key + Gateway URL */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Your Gateway</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">API Key</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-gray-800 px-4 py-2.5 font-mono text-sm text-cyan-400 overflow-x-auto">{session?.apiKey}</code>
              <button onClick={copyKey} className="rounded-lg bg-gray-800 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 shrink-0">
                {copied ? "✓" : "Copy"}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Gateway URL (use in Claude Desktop / Cursor)</label>
            <code className="block rounded-lg bg-gray-800 px-4 py-2.5 font-mono text-sm text-gray-300 overflow-x-auto">{gatewayUrl}</code>
          </div>
        </div>
      </div>

      {/* Quick Config */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-6">
        <h2 className="text-lg font-semibold text-white mb-3">Quick Setup</h2>
        <p className="text-sm text-gray-400 mb-3">Add this to your MCP client config:</p>
        <pre className="rounded-lg bg-gray-800 p-4 text-sm font-mono text-gray-300 overflow-x-auto">
{`{
  "mcpServers": {
    "gateway": {
      "url": "${gatewayUrl}"
    }
  }
}`}
        </pre>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatusCard label="Servers" value={servers.length} icon="🖥️" />
        <StatusCard label="Profiles" value={profiles.length} icon="📁" />
        <StatusCard label="Active Profile" value={activeProfile?.name || "All servers"} icon="✅" />
        <StatusCard label="Plan" value={session?.plan || "free"} icon="💎" />
      </div>
    </div>
  );
}

function StatusCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
