/**
 * MCP Proxy — intercepts MCP HTTP/SSE traffic, compresses tool definitions
 */
import type { Env, MCPResponse, ProxyContext } from "./types";
import { compressTools, estimateTokens } from "./compress";
import { validateApiKey, trackUsage } from "./auth";

/** Handle MCP HTTP POST proxy (JSON-RPC over HTTP) */
export async function handleProxy(request: Request, ctx: ProxyContext, apiKey: string, targetUrl: string): Promise<Response> {
  // Validate API key
  const key = await validateApiKey(ctx.env, apiKey);
  if (!key) {
    return jsonResponse({ error: "Invalid API key" }, 401);
  }

  // Forward request to downstream MCP server
  const downstreamReq = new Request(targetUrl, {
    method: request.method,
    headers: filterHeaders(request.headers, targetUrl),
    body: request.body,
  });

  let response: Response;
  try {
    response = await fetch(downstreamReq);
  } catch (e: any) {
    return jsonResponse({ error: `Downstream error: ${e.message}` }, 502);
  }

  // Only compress JSON-RPC responses that contain tools
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("json")) {
    // Non-JSON: still track the request (with estimated token count)
    const bodyBytes = response.headers.get("content-length");
    const estimated = bodyBytes ? Math.ceil(parseInt(bodyBytes) / 4) : 0;
    ctx.waitUntil(trackUsage(ctx.env, apiKey, estimated, estimated));
    return response;
  }

  let bodyText: string;
  try {
    bodyText = await response.text();
  } catch {
    return response;
  }

  try {
    const body: MCPResponse = JSON.parse(bodyText);

    // Check if this is a tools/list response
    if (body.result?.tools && Array.isArray(body.result.tools)) {
      const { tools, tokensBefore, tokensAfter } = compressTools(body.result.tools);
      body.result.tools = tools;

      // Track usage via waitUntil (ensures KV write completes after response)
      ctx.waitUntil(trackUsage(ctx.env, apiKey, tokensBefore, tokensAfter));

      // Add compression headers
      const headers = new Headers(response.headers);
      headers.set("x-mtg-tokens-before", String(tokensBefore));
      headers.set("x-mtg-tokens-after", String(tokensAfter));
      headers.set("x-mtg-tokens-saved", String(tokensBefore - tokensAfter));
      headers.set("x-mtg-compression-ratio", ((1 - tokensAfter / tokensBefore) * 100).toFixed(1) + "%");

      return new Response(JSON.stringify(body), {
        status: response.status,
        headers,
      });
    }

    // Non-tools JSON response: track pass-through request
    const estimated = estimateTokens(bodyText);
    ctx.waitUntil(trackUsage(ctx.env, apiKey, estimated, estimated));

    return new Response(bodyText, {
      status: response.status,
      headers: response.headers,
    });
  } catch {
    // JSON parse fail: track and return raw text
    const estimated = estimateTokens(bodyText);
    ctx.waitUntil(trackUsage(ctx.env, apiKey, estimated, estimated));
    return new Response(bodyText, {
      status: response.status,
      headers: response.headers,
    });
  }
}

/** Handle SSE proxy — stream through, intercept tools/list in SSE events */
export async function handleSSEProxy(request: Request, ctx: ProxyContext, apiKey: string, targetUrl: string): Promise<Response> {
  const key = await validateApiKey(ctx.env, apiKey);
  if (!key) {
    return jsonResponse({ error: "Invalid API key" }, 401);
  }

  // Connect to downstream SSE
  const downstreamReq = new Request(targetUrl, {
    method: request.method,
    headers: filterHeaders(request.headers, targetUrl),
    body: request.body,
  });

  let response: Response;
  try {
    response = await fetch(downstreamReq);
  } catch (e: any) {
    return jsonResponse({ error: `Downstream error: ${e.message}` }, 502);
  }

  if (!response.body) return response;

  // For SSE, we need to intercept and transform the stream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  // Track that a proxy request happened (at least 1 request)
  ctx.waitUntil(trackUsage(ctx.env, apiKey, 0, 0));

  // Process SSE stream in background
  const streamProcessing = (async () => {
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data: MCPResponse = JSON.parse(line.slice(6));
              if (data.result?.tools && Array.isArray(data.result.tools)) {
                const { tools, tokensBefore, tokensAfter } = compressTools(data.result.tools);
                data.result.tools = tools;
                // Use waitUntil for the KV write
                ctx.waitUntil(trackUsage(ctx.env, apiKey, tokensBefore, tokensAfter));
                await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n`));
                continue;
              }
            } catch {
              // Not JSON or parse error — pass through
            }
          }
          await writer.write(encoder.encode(line + "\n"));
        }
      }
      if (buffer) await writer.write(encoder.encode(buffer));
    } catch {
      // Stream error
    } finally {
      await writer.close();
    }
  })();
  ctx.waitUntil(streamProcessing);

  const headers = new Headers(response.headers);
  headers.set("x-mtg-proxy", "active");

  return new Response(readable, {
    status: response.status,
    headers,
  });
}

function filterHeaders(headers: Headers, targetUrl: string): Headers {
  const filtered = new Headers();
  // Forward content-type and auth headers
  for (const [key, value] of headers.entries()) {
    const lower = key.toLowerCase();
    if (["content-type", "authorization", "accept", "user-agent"].includes(lower)) {
      filtered.set(key, value);
    }
  }
  // Set host for downstream
  try {
    const url = new URL(targetUrl);
    filtered.set("Host", url.host);
  } catch {}
  return filtered;
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
