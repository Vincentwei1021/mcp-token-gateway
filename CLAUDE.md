# CLAUDE.md — MCP Control Plane (formerly MCP Token Gateway)

## Project Overview
Lightweight MCP Control Plane for indie devs. One gateway endpoint manages all MCP servers. Two components: Cloudflare Worker (gateway) and Next.js dashboard.

## Architecture
```
worker/                         # Cloudflare Worker — gateway + API
├── src/
│   ├── index.ts                # Entry — all routes, CORS, auth extraction
│   ├── gateway.ts              # ⭐ Core: unified MCP gateway (tools/list aggregation, tools/call routing)
│   ├── registry.ts             # Server CRUD + Profile CRUD (KV-backed)
│   ├── calls.ts                # Call logging + analytics aggregation
│   ├── proxy.ts                # Legacy single-server proxy (backward compat)
│   ├── compress.ts             # Tool description compression engine
│   ├── auth.ts                 # User registration, login, API key management
│   └── types.ts                # All TypeScript interfaces

dashboard/                      # Next.js — user-facing website
├── src/
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   └── dashboard/
│   │       ├── layout.tsx      # Auth gate + dashboard shell with tab nav
│   │       ├── page.tsx        # Overview (gateway URL, config, status)
│   │       ├── servers/page.tsx # Add/edit/remove MCP servers
│   │       ├── profiles/page.tsx # Create profiles, select servers, activate
│   │       └── analytics/page.tsx # Call stats, daily chart, top tools/servers
│   └── components/
│       ├── AuthProvider.tsx     # Auth context (login/register/api helper)
│       ├── AuthGate.tsx         # Login/register form gate
│       └── DashboardShell.tsx   # Header + tab navigation shell
```

## Gateway Flow
1. Client connects: `POST /gw/{apiKey}` (Streamable HTTP)
2. `initialize` → Gateway responds with capabilities
3. `tools/list` → Fan-out to all servers in active profile, merge tools, compress, cache tool→server mapping
4. `tools/call` → Look up cached mapping, route to correct upstream, log call, return result

## KV Schema
- `user:{email}` → User object
- `apikey:{key}` → ApiKey object
- `servers:{userId}` → MCPServer[] (max 20)
- `profiles:{userId}` → Profile[] (max 10)
- `active_profile:{apiKey}` → profileId
- `toolmap:{apiKey}` → ToolMapping (cached 1hr, rebuilt on tools/list)
- `calls:{apiKey}:{date}` → CallRecord[] (max 500/day, 90 day TTL)
- `usage:{apiKey}:{date}` → UsageRecord (token savings)

## Build & Deploy
### Worker
```bash
cd worker && npx tsc --noEmit && CLOUDFLARE_API_TOKEN=xxx npx wrangler deploy
```

### Dashboard
```bash
cd dashboard && npm run build && vercel --prod
```

## Key Conventions
- All async KV writes use `ctx.waitUntil()` — never fire-and-forget
- API keys prefixed `mtg_`
- Registry API requires `Authorization: Bearer {apiKey}` header
- Gateway accepts MCP JSON-RPC, responds with JSON
- Legacy routes (`/proxy/`, `/sse/`) maintained for backward compatibility
- Tool name collisions: last-registered server wins in mapping (MVP)
