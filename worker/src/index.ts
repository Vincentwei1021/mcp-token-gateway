/**
 * MCP Token Gateway — Cloudflare Worker Entry Point
 *
 * Routes:
 *   POST /proxy/:apiKey/*         → MCP HTTP proxy (JSON-RPC)
 *   GET  /sse/:apiKey/*           → MCP SSE proxy
 *   POST /sse/:apiKey/*           → MCP SSE messages proxy
 *   POST /api/register            → User registration
 *   POST /api/login               → User login
 *   GET  /api/usage/:apiKey       → Usage stats
 *   GET  /api/keys/:userId        → List API keys
 *   POST /api/keys/:userId        → Create API key
 *   GET  /health                  → Health check
 *   POST /api/test-compress       → Test compression on sample tools
 */
import type { Env } from "./types";
import { handleProxy, handleSSEProxy } from "./proxy";
import { registerUser, loginUser, getUsage, generateApiKey, validateApiKey } from "./auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // --- Health check ---
      if (path === "/health") {
        return json({ status: "ok", service: "mcp-token-gateway", version: "0.1.0" });
      }

      // --- MCP Proxy routes ---
      // POST /proxy/{apiKey}/{encoded-target-url}
      const proxyMatch = path.match(/^\/proxy\/([^/]+)\/(.+)$/);
      if (proxyMatch && request.method === "POST") {
        const [, apiKey, encodedTarget] = proxyMatch;
        const targetUrl = decodeURIComponent(encodedTarget);
        return addCors(await handleProxy(request, env, apiKey, targetUrl));
      }

      // SSE routes: GET/POST /sse/{apiKey}/{encoded-target-url}
      const sseMatch = path.match(/^\/sse\/([^/]+)\/(.+)$/);
      if (sseMatch) {
        const [, apiKey, encodedTarget] = sseMatch;
        const targetUrl = decodeURIComponent(encodedTarget);
        return addCors(await handleSSEProxy(request, env, apiKey, targetUrl));
      }

      // --- API routes ---
      if (path === "/api/register" && request.method === "POST") {
        const { email, password } = await request.json() as any;
        if (!email || !password) return json({ error: "Email and password required" }, 400);
        if (password.length < 6) return json({ error: "Password must be 6+ characters" }, 400);

        const { user, apiKey } = await registerUser(env, email, password);
        return json({
          success: true,
          userId: user.id,
          email: user.email,
          plan: user.plan,
          apiKey,
          message: "Registration successful. Use your API key to proxy MCP requests.",
        });
      }

      if (path === "/api/login" && request.method === "POST") {
        const { email, password } = await request.json() as any;
        if (!email || !password) return json({ error: "Email and password required" }, 400);

        const { user, apiKeys } = await loginUser(env, email, password);
        return json({
          success: true,
          userId: user.id,
          email: user.email,
          plan: user.plan,
          apiKeys,
        });
      }

      // GET /api/usage/{apiKey}?days=7
      const usageMatch = path.match(/^\/api\/usage\/([^/]+)$/);
      if (usageMatch && request.method === "GET") {
        const [, apiKey] = usageMatch;
        const key = await validateApiKey(env, apiKey);
        if (!key) return json({ error: "Invalid API key" }, 401);

        const days = parseInt(url.searchParams.get("days") || "7");
        const usage = await getUsage(env, apiKey, Math.min(days, 90));
        const totals = usage.reduce(
          (acc, r) => ({
            requests: acc.requests + r.requests,
            tokensBefore: acc.tokensBefore + r.tokensBefore,
            tokensAfter: acc.tokensAfter + r.tokensAfter,
            tokensSaved: acc.tokensSaved + r.tokensSaved,
          }),
          { requests: 0, tokensBefore: 0, tokensAfter: 0, tokensSaved: 0 }
        );
        const savingsPercent = totals.tokensBefore > 0
          ? ((totals.tokensSaved / totals.tokensBefore) * 100).toFixed(1)
          : "0";

        return json({
          success: true,
          period: `${days} days`,
          totals: { ...totals, savingsPercent: savingsPercent + "%" },
          daily: usage,
        });
      }

      // POST /api/test-compress — test compression on sample tool definitions
      if (path === "/api/test-compress" && request.method === "POST") {
        const { tools } = await request.json() as any;
        if (!tools || !Array.isArray(tools)) return json({ error: "Provide { tools: [...] }" }, 400);

        const { compressTools, estimateTokens } = await import("./compress");
        const before = JSON.stringify(tools);
        const { tools: compressed, tokensBefore, tokensAfter } = compressTools(tools);

        return json({
          success: true,
          tokensBefore,
          tokensAfter,
          tokensSaved: tokensBefore - tokensAfter,
          savingsPercent: ((1 - tokensAfter / tokensBefore) * 100).toFixed(1) + "%",
          compressedTools: compressed,
        });
      }

      // --- 404 ---
      return json({
        error: "Not found",
        docs: "https://github.com/Vincentwei1021/mcp-token-gateway",
        routes: {
          proxy: "POST /proxy/{apiKey}/{encoded-target-url}",
          sse: "GET|POST /sse/{apiKey}/{encoded-target-url}",
          register: "POST /api/register",
          login: "POST /api/login",
          usage: "GET /api/usage/{apiKey}",
          test: "POST /api/test-compress",
          health: "GET /health",
        },
      }, 404);

    } catch (e: any) {
      return json({ error: e.message || "Internal error" }, e.message?.includes("already registered") ? 409 : 500);
    }
  },
};

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function addCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    headers.set(k, v);
  }
  return new Response(response.body, { status: response.status, headers });
}
