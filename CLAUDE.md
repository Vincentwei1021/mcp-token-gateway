# CLAUDE.md — MCP Token Gateway

## Project Overview
Lightweight SaaS proxy that compresses MCP tool definitions, saving 40-90% token costs. Two components: Cloudflare Worker (proxy) and Next.js dashboard.

## Architecture
```
worker/                      # Cloudflare Worker — the proxy engine
├── src/
│   ├── index.ts             # Worker entry — routes, CORS, auth, ExecutionContext
│   ├── proxy.ts             # MCP HTTP/SSE proxy — intercepts tools/list, compresses
│   ├── compress.ts          # Compression engine — rules-based tool description optimization
│   ├── auth.ts              # User registration, login, API key management (KV-backed)
│   └── types.ts             # TypeScript interfaces (Env, ProxyContext, MCPToolDefinition, etc.)
├── wrangler.toml            # CF Worker config (KV bindings, routes)
├── package.json
└── tsconfig.json

dashboard/                   # Next.js — user-facing website
├── src/app/
│   ├── layout.tsx           # Root layout (DM Sans + JetBrains Mono)
│   ├── globals.css          # Dark theme, cyan accent, glow animations
│   ├── page.tsx             # Landing page (hero, before/after, pricing, config examples)
│   └── dashboard/
│       └── page.tsx         # Auth + dashboard (API key, usage charts, setup guide)
└── package.json
```

## Tech Stack
- **Worker**: Cloudflare Workers + Workers KV
- **Dashboard**: Next.js 15 + Tailwind CSS v4
- **Fonts**: DM Sans (body), JetBrains Mono (code)
- **Colors**: Cyan (#22d3ee) accent on dark (#030712) background
- **Domain**: gateway.toolboxlite.com (Worker) + same for dashboard

## Build & Deploy

### Worker
```bash
cd worker
npm install
npx tsc --noEmit              # Type check
npx wrangler deploy --dry-run  # Verify bundle
CLOUDFLARE_API_TOKEN=xxx npx wrangler deploy  # Deploy to CF edge
```

### Dashboard
```bash
cd dashboard
npm install
npm run build                  # Verify build
vercel --prod                  # Deploy to Vercel
```

## Key Conventions
- Worker uses `ExecutionContext.waitUntil()` for all async KV writes (usage tracking) — never fire-and-forget
- API keys are prefixed `mtg_` (MCP Token Gateway)
- Compression in `compress.ts` uses smart sentence boundary detection that handles abbreviations (e.g., i.e., etc.)
- URL format: `https://gateway.toolboxlite.com/{proxy|sse}/{apiKey}/{url-encoded-target}`
- Dashboard stores session in localStorage (`mtg_session`)
- CORS enabled for all origins

## Compression Rules (V0.1)
1. Description trimming — remove filler phrases, keep first 2 sentences
2. Schema minification — remove redundant property descriptions, examples
3. Whitespace collapse — eliminate extra spaces/newlines
4. Enum description removal — self-explanatory enums don't need descriptions
5. Smart sentence boundary — skip abbreviations (e.g., i.e.), decimals, single-letter abbrevs

## Known Limitations
- CF Workers cannot proxy to other Cloudflare-proxied domains (Error 1016 CDN loop)
- Workaround: use origin IP or non-CF domains as downstream targets

## Environment
- KV namespace ID: `9b8fa45e3dc740068207360560f174fd`
- CF Account: `eb2875560d1c2007133b1925165333f9`
- Needs `CLOUDFLARE_API_TOKEN` env var for non-interactive deploy

## Git
- Remote: https://github.com/Vincentwei1021/mcp-token-gateway.git
- Branch: master
- Always push after changes
