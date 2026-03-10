"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

interface DailyStats {
  date: string;
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  avgLatencyMs: number;
  byServer: Record<string, number>;
  byTool: Record<string, number>;
}

interface Summary {
  totalCalls: number;
  successRate: string;
  avgLatencyMs: number;
  topTools: Array<{ name: string; count: number }>;
  topServers: Array<{ name: string; count: number }>;
  errorRate: string;
}

export default function AnalyticsPage() {
  const { session } = useAuth();
  const apiKey = session?.apiKey;
  const API = process.env.NEXT_PUBLIC_GATEWAY_URL || "https://gateway.toolboxlite.com";
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    if (!apiKey) return;
    fetch(`${API}/api/calls/${apiKey}?days=${days}`).then((r) => r.json()).then((d) => d.success && setStats(d.stats));
    fetch(`${API}/api/calls/${apiKey}/summary?days=${days}`).then((r) => r.json()).then((d) => d.success && setSummary(d.summary));
  }, [apiKey, days]);

  const maxCalls = Math.max(...stats.map((d) => d.totalCalls), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Analytics</h1>
        <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:outline-none">
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card label="Total Calls" value={summary.totalCalls.toLocaleString()} />
          <Card label="Success Rate" value={summary.successRate} color="text-green-400" />
          <Card label="Avg Latency" value={`${summary.avgLatencyMs}ms`} />
          <Card label="Error Rate" value={summary.errorRate} color={parseFloat(summary.errorRate) > 5 ? "text-red-400" : "text-gray-400"} />
        </div>
      )}

      {/* Daily Chart */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Daily Calls</h2>
        {stats.every((d) => d.totalCalls === 0) ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-gray-400">No call data yet.</p>
            <p className="text-sm text-gray-500">Connect your MCP client to the gateway to see analytics.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.map((day) => (
              <div key={day.date} className="flex items-center gap-3">
                <div className="w-20 text-xs text-gray-500 font-mono shrink-0">{day.date.slice(5)}</div>
                <div className="flex-1 flex gap-0.5 h-6 items-center">
                  <div className="h-4 rounded-sm bg-green-500/70" style={{ width: `${(day.successCalls / maxCalls) * 100}%`, minWidth: day.successCalls > 0 ? "2px" : "0" }}
                    title={`Success: ${day.successCalls}`} />
                  <div className="h-4 rounded-sm bg-red-500/70" style={{ width: `${(day.errorCalls / maxCalls) * 100}%`, minWidth: day.errorCalls > 0 ? "2px" : "0" }}
                    title={`Errors: ${day.errorCalls}`} />
                </div>
                <div className="w-20 text-right text-xs text-gray-500">{day.totalCalls} / {day.avgLatencyMs}ms</div>
              </div>
            ))}
            <div className="flex gap-4 pt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-green-500/70" />Success</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-500/70" />Error</span>
            </div>
          </div>
        )}
      </div>

      {/* Top Tools + Servers */}
      {summary && (summary.topTools.length > 0 || summary.topServers.length > 0) && (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-6">
            <h3 className="font-semibold text-white mb-3">Top Tools</h3>
            {summary.topTools.length === 0 ? (
              <p className="text-sm text-gray-500">No tool calls yet.</p>
            ) : (
              <div className="space-y-2">
                {summary.topTools.map((t, i) => (
                  <div key={t.name} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300 truncate flex-1">{i + 1}. {t.name}</span>
                    <span className="text-sm font-mono text-cyan-400 ml-2">{t.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-6">
            <h3 className="font-semibold text-white mb-3">Top Servers</h3>
            {summary.topServers.length === 0 ? (
              <p className="text-sm text-gray-500">No server calls yet.</p>
            ) : (
              <div className="space-y-2">
                {summary.topServers.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300 truncate flex-1">{i + 1}. {s.name}</span>
                    <span className="text-sm font-mono text-cyan-400 ml-2">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, color = "text-white" }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
