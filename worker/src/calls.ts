/**
 * Call Logging + Analytics — KV-backed
 */
import type { Env, CallRecord, DailyCallStats } from "./types";

/** Log a single tool call */
export async function logCall(env: Env, apiKey: string, record: CallRecord): Promise<void> {
  const date = record.timestamp.split("T")[0];
  const key = `calls:${apiKey}:${date}`;

  const existing = await env.KV.get(key);
  const calls: CallRecord[] = existing ? JSON.parse(existing) : [];
  calls.push(record);

  // Keep max 500 calls per day per key
  const trimmed = calls.length > 500 ? calls.slice(-500) : calls;
  await env.KV.put(key, JSON.stringify(trimmed), { expirationTtl: 90 * 86400 });
}

/** Get daily call stats for the last N days */
export async function getCallStats(env: Env, apiKey: string, days: number = 7): Promise<DailyCallStats[]> {
  const stats: DailyCallStats[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split("T")[0];
    const key = `calls:${apiKey}:${date}`;
    const data = await env.KV.get(key);

    if (!data) {
      stats.push({ date, totalCalls: 0, successCalls: 0, errorCalls: 0, avgLatencyMs: 0, byServer: {}, byTool: {} });
      continue;
    }

    const calls: CallRecord[] = JSON.parse(data);
    const successCalls = calls.filter((c) => c.success).length;
    const errorCalls = calls.length - successCalls;
    const avgLatencyMs = calls.length > 0
      ? Math.round(calls.reduce((sum, c) => sum + c.latencyMs, 0) / calls.length)
      : 0;

    const byServer: Record<string, number> = {};
    const byTool: Record<string, number> = {};
    for (const c of calls) {
      byServer[c.serverName] = (byServer[c.serverName] || 0) + 1;
      byTool[c.tool] = (byTool[c.tool] || 0) + 1;
    }

    stats.push({ date, totalCalls: calls.length, successCalls, errorCalls, avgLatencyMs, byServer, byTool });
  }

  return stats.reverse();
}

/** Get top tools and servers for a period */
export async function getCallSummary(env: Env, apiKey: string, days: number = 7): Promise<{
  totalCalls: number;
  successRate: string;
  avgLatencyMs: number;
  topTools: Array<{ name: string; count: number }>;
  topServers: Array<{ name: string; count: number }>;
  errorRate: string;
}> {
  const dailyStats = await getCallStats(env, apiKey, days);

  let totalCalls = 0;
  let successCalls = 0;
  let totalLatency = 0;
  const toolCounts: Record<string, number> = {};
  const serverCounts: Record<string, number> = {};

  for (const day of dailyStats) {
    totalCalls += day.totalCalls;
    successCalls += day.successCalls;
    totalLatency += day.avgLatencyMs * day.totalCalls;
    for (const [t, c] of Object.entries(day.byTool)) toolCounts[t] = (toolCounts[t] || 0) + c;
    for (const [s, c] of Object.entries(day.byServer)) serverCounts[s] = (serverCounts[s] || 0) + c;
  }

  const topTools = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const topServers = Object.entries(serverCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return {
    totalCalls,
    successRate: totalCalls > 0 ? ((successCalls / totalCalls) * 100).toFixed(1) + "%" : "0%",
    avgLatencyMs: totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0,
    topTools,
    topServers,
    errorRate: totalCalls > 0 ? (((totalCalls - successCalls) / totalCalls) * 100).toFixed(1) + "%" : "0%",
  };
}
