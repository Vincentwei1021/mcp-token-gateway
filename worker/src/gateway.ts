/**
 * Unified MCP Gateway — aggregates multiple MCP servers behind one endpoint.
 *
 * Handles:
 *   - tools/list: fan-out to all servers in active profile, merge + compress
 *   - tools/call: route to correct upstream server via cached tool mapping
 *   - initialize: respond with gateway capabilities
 *   - Other methods: pass through to first available server
 */
import type { Env, ProxyContext, MCPServer, MCPRequest, MCPResponse, MCPToolDefinition, ToolMapping, CallRecord } from "./types";
import { validateApiKey } from "./auth";
import { getActiveProfile, getServersForProfile, listServers, listProfiles } from "./registry";
import { compressTools, estimateTokens } from "./compress";
import { logCall } from "./calls";

const GATEWAY_INFO = {
  name: "MCP Token Gateway",
  version: "0.2.0",
};

/** Handle HTTP POST JSON-RPC gateway request */
export async function handleGateway(request: Request, ctx: ProxyContext, apiKey: string): Promise<Response> {
  const key = await validateApiKey(ctx.env, apiKey);
  if (!key) return jsonRpcError(null, -32001, "Invalid API key");

  let body: MCPRequest;
  try {
    body = await request.json() as MCPRequest;
  } catch {
    return jsonRpcError(null, -32700, "Parse error");
  }

  if (!body.method) return jsonRpcError(body.id, -32600, "Invalid request: method required");

  const response = await routeRequest(ctx, key.userId, apiKey, body);
  return new Response(JSON.stringify(response), {
    headers: { "Content-Type": "application/json" },
  });
}

/** Handle SSE gateway — returns event stream endpoint */
export async function handleGatewaySSE(request: Request, ctx: ProxyContext, apiKey: string): Promise<Response> {
  const key = await validateApiKey(ctx.env, apiKey);
  if (!key) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const messageUrl = `${url.protocol}//${url.host}/gw/${apiKey}/message`;

  // SSE response with endpoint event
  const encoder = new TextEncoder();
  const body = encoder.encode(
    `event: endpoint\ndata: ${messageUrl}\n\n`
  );

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

/** Handle SSE message endpoint */
export async function handleGatewayMessage(request: Request, ctx: ProxyContext, apiKey: string): Promise<Response> {
  return handleGateway(request, ctx, apiKey);
}

// ── Internal routing ──

async function routeRequest(ctx: ProxyContext, userId: string, apiKey: string, req: MCPRequest): Promise<MCPResponse> {
  switch (req.method) {
    case "initialize":
      return handleInitialize(req);
    case "tools/list":
      return handleToolsList(ctx, userId, apiKey, req);
    case "tools/call":
      return handleToolsCall(ctx, userId, apiKey, req);
    case "notifications/initialized":
      return { jsonrpc: "2.0", id: req.id };
    default:
      return { jsonrpc: "2.0", id: req.id, error: { code: -32601, message: `Method not found: ${req.method}` } };
  }
}

function handleInitialize(req: MCPRequest): MCPResponse {
  return {
    jsonrpc: "2.0",
    id: req.id,
    result: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: { listChanged: false },
      },
      serverInfo: GATEWAY_INFO,
    },
  };
}

async function handleToolsList(ctx: ProxyContext, userId: string, apiKey: string, req: MCPRequest): Promise<MCPResponse> {
  // Determine which servers to query
  const servers = await getActiveServers(ctx.env, userId, apiKey);

  if (servers.length === 0) {
    return {
      jsonrpc: "2.0",
      id: req.id,
      result: { tools: [] },
    };
  }

  // Fan-out: call tools/list on all servers in parallel
  const results = await Promise.allSettled(
    servers.map((server) => fetchToolsFromServer(server))
  );

  // Merge tools + build tool→server mapping
  const allTools: MCPToolDefinition[] = [];
  const mapping: ToolMapping = {};

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const server = servers[i];

    if (result.status === "fulfilled" && result.value) {
      for (const tool of result.value) {
        allTools.push(tool);
        mapping[tool.name] = {
          serverId: server.id,
          serverUrl: server.url,
          serverTransport: server.transport,
          serverAuthType: server.authType,
          serverAuthValue: server.authValue,
          serverAuthHeader: server.authHeader,
        };
      }
    }
    // Skip failed servers silently — partial results are better than nothing
  }

  // Cache the mapping for tools/call routing
  ctx.waitUntil(
    ctx.env.KV.put(`toolmap:${apiKey}`, JSON.stringify(mapping), { expirationTtl: 3600 })
  );

  // Apply compression
  const { tools: compressed, tokensBefore, tokensAfter } = compressTools(allTools);

  // Track token savings
  ctx.waitUntil(
    (async () => {
      const { trackUsage } = await import("./auth");
      await trackUsage(ctx.env, apiKey, tokensBefore, tokensAfter);
    })()
  );

  return {
    jsonrpc: "2.0",
    id: req.id,
    result: { tools: compressed },
  };
}

async function handleToolsCall(ctx: ProxyContext, userId: string, apiKey: string, req: MCPRequest): Promise<MCPResponse> {
  const toolName = req.params?.name;
  if (!toolName) {
    return { jsonrpc: "2.0", id: req.id, error: { code: -32602, message: "Missing tool name in params.name" } };
  }

  // Look up which server owns this tool
  const mappingData = await ctx.env.KV.get(`toolmap:${apiKey}`);
  if (!mappingData) {
    return { jsonrpc: "2.0", id: req.id, error: { code: -32603, message: "Tool mapping not found. Call tools/list first." } };
  }

  const mapping: ToolMapping = JSON.parse(mappingData);
  const target = mapping[toolName];
  if (!target) {
    return { jsonrpc: "2.0", id: req.id, error: { code: -32602, message: `Unknown tool: ${toolName}` } };
  }

  // Forward to upstream server
  const start = Date.now();
  let success = true;
  let errorMsg: string | undefined;
  let response: MCPResponse;

  try {
    response = await forwardToolCall(target, req);
    if (response.error) {
      success = false;
      errorMsg = response.error.message;
    }
  } catch (e: any) {
    success = false;
    errorMsg = e.message;
    response = { jsonrpc: "2.0", id: req.id, error: { code: -32603, message: `Upstream error: ${e.message}` } };
  }

  const latencyMs = Date.now() - start;

  // Get server name for logging
  const servers = await getActiveServers(ctx.env, userId, apiKey);
  const server = servers.find((s) => s.id === target.serverId);
  const serverName = server?.name || target.serverId;

  // Log the call
  const callRecord: CallRecord = {
    timestamp: new Date().toISOString(),
    tool: toolName,
    serverId: target.serverId,
    serverName,
    latencyMs,
    success,
    errorMessage: errorMsg,
    tokensEstimated: estimateTokens(JSON.stringify(response)),
  };
  ctx.waitUntil(logCall(ctx.env, apiKey, callRecord));

  return response;
}

// ── Upstream communication ──

async function fetchToolsFromServer(server: MCPServer): Promise<MCPToolDefinition[]> {
  const headers = buildAuthHeaders(server);
  headers["Content-Type"] = "application/json";
  headers["Accept"] = "application/json, text/event-stream";

  // Some upstream servers require initialize before tools/list
  const initBody: MCPRequest = {
    jsonrpc: "2.0",
    id: 0,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: GATEWAY_INFO,
    },
  };

  // Fire initialize (best-effort, don't block on failure)
  try {
    await fetch(server.url, { method: "POST", headers, body: JSON.stringify(initBody) });
  } catch {}

  const body: MCPRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
  };

  const res = await fetch(server.url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) return [];

  // Handle SSE response (some servers return text/event-stream)
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    const text = await res.text();
    // Parse SSE: find "data: " lines containing JSON-RPC result
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6)) as MCPResponse;
          if (data.result?.tools) return data.result.tools;
        } catch {}
      }
    }
    return [];
  }

  const data = await res.json() as MCPResponse;
  return data.result?.tools || [];
}

async function forwardToolCall(target: ToolMapping[string], req: MCPRequest): Promise<MCPResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
  };

  if (target.serverAuthType === "bearer" && target.serverAuthValue) {
    headers["Authorization"] = `Bearer ${target.serverAuthValue}`;
  } else if (target.serverAuthType === "header" && target.serverAuthHeader && target.serverAuthValue) {
    headers[target.serverAuthHeader] = target.serverAuthValue;
  }

  const res = await fetch(target.serverUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    throw new Error(`Upstream returned ${res.status}`);
  }

  // Handle SSE response
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    const text = await res.text();
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ")) {
        try {
          return JSON.parse(line.slice(6)) as MCPResponse;
        } catch {}
      }
    }
    throw new Error("No valid JSON-RPC response in SSE stream");
  }

  return await res.json() as MCPResponse;
}

function buildAuthHeaders(server: MCPServer): Record<string, string> {
  const headers: Record<string, string> = {};
  if (server.authType === "bearer" && server.authValue) {
    headers["Authorization"] = `Bearer ${server.authValue}`;
  } else if (server.authType === "header" && server.authHeader && server.authValue) {
    headers[server.authHeader] = server.authValue;
  }
  return headers;
}

// ── Helpers ──

async function getActiveServers(env: Env, userId: string, apiKey: string): Promise<MCPServer[]> {
  const profileId = await getActiveProfile(env, apiKey);
  if (profileId) {
    return getServersForProfile(env, userId, profileId);
  }
  // No active profile — return all servers (default behavior)
  return listServers(env, userId);
}

function jsonRpcError(id: number | string | null | undefined, code: number, message: string): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }), {
    headers: { "Content-Type": "application/json" },
  });
}
