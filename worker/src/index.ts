/**
 * MCP Token Gateway v0.2 — Lightweight MCP Control Plane
 *
 * Gateway routes:
 *   POST /gw/:apiKey              → Unified MCP gateway (JSON-RPC)
 *   GET  /gw/:apiKey/sse          → Gateway SSE endpoint
 *   POST /gw/:apiKey/message      → Gateway SSE message endpoint
 *
 * Registry API:
 *   GET    /api/servers            → List user's MCP servers
 *   POST   /api/servers            → Add MCP server
 *   PUT    /api/servers/:id        → Update server
 *   DELETE /api/servers/:id        → Delete server
 *   GET    /api/profiles           → List profiles
 *   POST   /api/profiles           → Create profile
 *   PUT    /api/profiles/:id       → Update profile
 *   DELETE /api/profiles/:id       → Delete profile
 *   PUT    /api/active-profile     → Set active profile for API key
 *   GET    /api/active-profile     → Get active profile for API key
 *
 * Analytics API:
 *   GET    /api/calls/:apiKey      → Call stats (daily breakdown)
 *   GET    /api/calls/:apiKey/summary → Call summary (top tools/servers)
 *
 * Legacy routes (backward compat):
 *   POST /proxy/:apiKey/:url       → Direct proxy
 *   GET|POST /sse/:apiKey/:url     → Direct SSE proxy
 *
 * Auth routes:
 *   POST /api/register             → Register
 *   POST /api/login                → Login
 *   GET  /api/usage/:apiKey        → Token usage stats
 *
 * System:
 *   GET  /health                   → Health check
 *   POST /api/test-compress        → Test compression
 */
import type { Env, ProxyContext } from "./types";
import { handleProxy, handleSSEProxy } from "./proxy";
import { handleGateway, handleGatewaySSE, handleGatewayMessage } from "./gateway";
import { registerUser, loginUser, getUsage, validateApiKey } from "./auth";
import { listServers, addServer, updateServer, deleteServer, listProfiles, createProfile, updateProfile, deleteProfile, getActiveProfile, setActiveProfile } from "./registry";
import { getCallStats, getCallSummary } from "./calls";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default {
  async fetch(request: Request, env: Env, executionCtx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const ctx: ProxyContext = { env, waitUntil: (p) => executionCtx.waitUntil(p) };

    try {
      // ── Health ──
      if (path === "/health") {
        return json({ status: "ok", service: "mcp-token-gateway", version: "0.2.0" });
      }

      // ── Gateway routes ──
      const gwMatch = path.match(/^\/gw\/([^/]+)$/);
      if (gwMatch && request.method === "POST") {
        return addCors(await handleGateway(request, ctx, gwMatch[1]));
      }

      const gwSseMatch = path.match(/^\/gw\/([^/]+)\/sse$/);
      if (gwSseMatch && request.method === "GET") {
        return addCors(await handleGatewaySSE(request, ctx, gwSseMatch[1]));
      }

      const gwMsgMatch = path.match(/^\/gw\/([^/]+)\/message$/);
      if (gwMsgMatch && request.method === "POST") {
        return addCors(await handleGatewayMessage(request, ctx, gwMsgMatch[1]));
      }

      // ── Legacy proxy routes ──
      const proxyMatch = path.match(/^\/proxy\/([^/]+)\/(.+)$/);
      if (proxyMatch && request.method === "POST") {
        return addCors(await handleProxy(request, ctx, proxyMatch[1], decodeURIComponent(proxyMatch[2])));
      }

      const sseMatch = path.match(/^\/sse\/([^/]+)\/(.+)$/);
      if (sseMatch) {
        return addCors(await handleSSEProxy(request, ctx, sseMatch[1], decodeURIComponent(sseMatch[2])));
      }

      // ── Auth API ──
      if (path === "/api/register" && request.method === "POST") {
        const body = await safeJson(request);
        if (!body) return json({ error: "Invalid JSON body" }, 400);
        const { email, password } = body;
        if (!email || !password) return json({ error: "Email and password required" }, 400);
        if (typeof email !== "string" || !isValidEmail(email)) return json({ error: "Invalid email format" }, 400);
        if (typeof password !== "string" || password.length < 6) return json({ error: "Password must be 6+ characters" }, 400);

        const { user, apiKey } = await registerUser(env, email, password);
        return json({ success: true, userId: user.id, email: user.email, plan: user.plan, apiKey });
      }

      if (path === "/api/login" && request.method === "POST") {
        const body = await safeJson(request);
        if (!body) return json({ error: "Invalid JSON body" }, 400);
        const { email, password } = body;
        if (!email || !password) return json({ error: "Email and password required" }, 400);

        const { user, apiKeys } = await loginUser(env, email, password);
        return json({ success: true, userId: user.id, email: user.email, plan: user.plan, apiKeys });
      }

      // ── Server Registry API (requires apiKey in Authorization header) ──
      const apiKeyHeader = extractApiKey(request);

      if (path === "/api/servers" && apiKeyHeader) {
        const key = await validateApiKey(env, apiKeyHeader);
        if (!key) return json({ error: "Invalid API key" }, 401);

        if (request.method === "GET") {
          const servers = await listServers(env, key.userId);
          return json({ success: true, servers });
        }

        if (request.method === "POST") {
          const body = await safeJson(request);
          if (!body) return json({ error: "Invalid JSON body" }, 400);
          if (!body.name || !body.url) return json({ error: "name and url required" }, 400);
          const server = await addServer(env, key.userId, body);
          return json({ success: true, server });
        }
      }

      const serverIdMatch = path.match(/^\/api\/servers\/([^/]+)$/);
      if (serverIdMatch && apiKeyHeader) {
        const key = await validateApiKey(env, apiKeyHeader);
        if (!key) return json({ error: "Invalid API key" }, 401);
        const serverId = serverIdMatch[1];

        if (request.method === "PUT") {
          const body = await safeJson(request);
          if (!body) return json({ error: "Invalid JSON body" }, 400);
          const server = await updateServer(env, key.userId, serverId, body);
          return server ? json({ success: true, server }) : json({ error: "Server not found" }, 404);
        }

        if (request.method === "DELETE") {
          const deleted = await deleteServer(env, key.userId, serverId);
          return deleted ? json({ success: true }) : json({ error: "Server not found" }, 404);
        }
      }

      // ── Profile API ──
      if (path === "/api/profiles" && apiKeyHeader) {
        const key = await validateApiKey(env, apiKeyHeader);
        if (!key) return json({ error: "Invalid API key" }, 401);

        if (request.method === "GET") {
          const profiles = await listProfiles(env, key.userId);
          return json({ success: true, profiles });
        }

        if (request.method === "POST") {
          const body = await safeJson(request);
          if (!body) return json({ error: "Invalid JSON body" }, 400);
          if (!body.name) return json({ error: "name required" }, 400);
          const profile = await createProfile(env, key.userId, { name: body.name, serverIds: body.serverIds || [] });
          return json({ success: true, profile });
        }
      }

      const profileIdMatch = path.match(/^\/api\/profiles\/([^/]+)$/);
      if (profileIdMatch && apiKeyHeader) {
        const key = await validateApiKey(env, apiKeyHeader);
        if (!key) return json({ error: "Invalid API key" }, 401);
        const profileId = profileIdMatch[1];

        if (request.method === "PUT") {
          const body = await safeJson(request);
          if (!body) return json({ error: "Invalid JSON body" }, 400);
          const profile = await updateProfile(env, key.userId, profileId, body);
          return profile ? json({ success: true, profile }) : json({ error: "Profile not found" }, 404);
        }

        if (request.method === "DELETE") {
          const deleted = await deleteProfile(env, key.userId, profileId);
          return deleted ? json({ success: true }) : json({ error: "Profile not found" }, 404);
        }
      }

      // ── Active Profile ──
      if (path === "/api/active-profile" && apiKeyHeader) {
        const key = await validateApiKey(env, apiKeyHeader);
        if (!key) return json({ error: "Invalid API key" }, 401);

        if (request.method === "GET") {
          const profileId = await getActiveProfile(env, apiKeyHeader);
          return json({ success: true, profileId });
        }

        if (request.method === "PUT") {
          const body = await safeJson(request);
          if (!body?.profileId) return json({ error: "profileId required" }, 400);
          await setActiveProfile(env, apiKeyHeader, body.profileId);
          return json({ success: true });
        }
      }

      // ── Call Analytics ──
      const callsMatch = path.match(/^\/api\/calls\/([^/]+)$/);
      if (callsMatch && request.method === "GET") {
        const callApiKey = callsMatch[1];
        const key = await validateApiKey(env, callApiKey);
        if (!key) return json({ error: "Invalid API key" }, 401);

        const days = parseInt(url.searchParams.get("days") || "7");
        const stats = await getCallStats(env, callApiKey, Math.min(days, 90));
        return json({ success: true, stats });
      }

      const callsSummaryMatch = path.match(/^\/api\/calls\/([^/]+)\/summary$/);
      if (callsSummaryMatch && request.method === "GET") {
        const callApiKey = callsSummaryMatch[1];
        const key = await validateApiKey(env, callApiKey);
        if (!key) return json({ error: "Invalid API key" }, 401);

        const days = parseInt(url.searchParams.get("days") || "7");
        const summary = await getCallSummary(env, callApiKey, Math.min(days, 90));
        return json({ success: true, summary });
      }

      // ── Legacy usage ──
      const usageMatch = path.match(/^\/api\/usage\/([^/]+)$/);
      if (usageMatch && request.method === "GET") {
        const usageApiKey = usageMatch[1];
        const key = await validateApiKey(env, usageApiKey);
        if (!key) return json({ error: "Invalid API key" }, 401);

        const days = parseInt(url.searchParams.get("days") || "7");
        const usage = await getUsage(env, usageApiKey, Math.min(days, 90));
        const totals = usage.reduce(
          (acc, r) => ({
            requests: acc.requests + r.requests,
            tokensBefore: acc.tokensBefore + r.tokensBefore,
            tokensAfter: acc.tokensAfter + r.tokensAfter,
            tokensSaved: acc.tokensSaved + r.tokensSaved,
          }),
          { requests: 0, tokensBefore: 0, tokensAfter: 0, tokensSaved: 0 }
        );

        return json({ success: true, period: `${days} days`, totals, daily: usage });
      }

      // ── Test compress ──
      if (path === "/api/test-compress" && request.method === "POST") {
        const body = await safeJson(request);
        if (!body) return json({ error: "Request body must be valid JSON" }, 400);
        if (!body.tools || !Array.isArray(body.tools)) return json({ error: "Provide { tools: [...] }" }, 400);

        const { compressTools } = await import("./compress");
        const { tools: compressed, tokensBefore, tokensAfter } = compressTools(body.tools);
        return json({
          success: true, tokensBefore, tokensAfter,
          tokensSaved: tokensBefore - tokensAfter,
          savingsPercent: ((1 - tokensAfter / tokensBefore) * 100).toFixed(1) + "%",
          compressedTools: compressed,
        });
      }

      // ── 404 ──
      return json({ error: "Not found", docs: "https://github.com/Vincentwei1021/mcp-token-gateway" }, 404);

    } catch (e: any) {
      const msg = e.message || "";
      if (msg.includes("already registered")) return json({ error: "Email already registered" }, 409);
      if (msg.includes("Invalid credentials")) return json({ error: "Invalid credentials" }, 401);
      if (msg.includes("Maximum")) return json({ error: msg }, 400);
      return json({ error: "Internal server error" }, 500);
    }
  },
};

// ── Helpers ──

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function addCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

async function safeJson(request: Request): Promise<any | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function extractApiKey(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
