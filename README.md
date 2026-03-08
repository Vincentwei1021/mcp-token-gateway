<div align="center">

# ⚡ MCP Token Gateway

**Cut 40-90% of MCP tool definition token overhead.**

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/powered%20by-Cloudflare%20Workers-orange)](https://workers.cloudflare.com)

[Dashboard](https://gateway.toolboxlite.com/dashboard) · [API Docs](#api-reference) · [Quick Start](#quick-start-30-seconds)

</div>

---

## The Problem

MCP tool definitions burn **75,000+ tokens** before your agent writes a single line of code:

```
10 MCP servers × 15 tools × 500 tokens = 75,000 tokens per session
= $0.375 per conversation start (Claude Sonnet)
= $375/month for a 5-person team
```

## The Solution

MCP Token Gateway is a lightweight proxy that compresses tool definitions on the fly:

- **40-50% savings** with rules-based compression (free tier)
- **Zero code changes** — just change the MCP server URL
- **<10ms latency** — Cloudflare edge, 300+ cities worldwide
- **Free tier** — 1,000 calls/day, no credit card

## Quick Start (30 Seconds)

### 1. Get your free API key

```bash
curl -X POST https://gateway.toolboxlite.com/api/register \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "yourpassword"}'
```

### 2. Update your MCP client config

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "github": {
      "url": "https://gateway.toolboxlite.com/sse/mtg_YOUR_KEY/https%3A%2F%2Fmcp.github.com%2Fsse"
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "my-server": {
      "url": "https://gateway.toolboxlite.com/sse/mtg_YOUR_KEY/https%3A%2F%2Fyour-mcp-server.com%2Fsse"
    }
  }
}
```

### 3. Done! 🎉

Tool definitions are compressed automatically. Check your savings at the [dashboard](https://gateway.toolboxlite.com/dashboard).

## How It Works

```
Your AI Client  →  MCP Token Gateway  →  Downstream MCP Server
(Claude/Cursor)    (Cloudflare Edge)      (GitHub/Slack/etc)
                        ↓
              Compresses tools/list
              response on the fly
              (40-90% fewer tokens)
```

### Compression Rules (V0.1)

1. **Description trimming** — Remove filler phrases ("This tool allows you to..."), keep first 2 sentences
2. **Schema minification** — Remove redundant property descriptions, examples, self-evident metadata
3. **Whitespace collapse** — Eliminate extra spaces, newlines, formatting
4. **Enum description removal** — If enum values are self-explanatory, drop the description

### URL Format

```
https://gateway.toolboxlite.com/{transport}/{apiKey}/{encoded-target-url}
```

| Parameter | Description |
|-----------|-------------|
| `transport` | `proxy` (HTTP POST) or `sse` (SSE) |
| `apiKey` | Your API key (starts with `mtg_`) |
| `encoded-target-url` | URL-encoded downstream MCP server URL |

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/proxy/{key}/{url}` | POST | Proxy MCP JSON-RPC request |
| `/sse/{key}/{url}` | GET/POST | Proxy MCP SSE connection |
| `/api/register` | POST | Create account (`{email, password}`) |
| `/api/login` | POST | Login (`{email, password}`) |
| `/api/usage/{key}` | GET | Get usage stats (`?days=7`) |
| `/api/test-compress` | POST | Test compression (`{tools: [...]}`) |
| `/health` | GET | Health check |

## Dashboard

Visit [gateway.toolboxlite.com/dashboard](https://gateway.toolboxlite.com/dashboard) to:

- Register and manage API keys
- View token savings (before vs after)
- Monitor daily usage

## Pricing

| Plan | Price | Calls/day | Savings |
|------|-------|-----------|---------|
| **Free** | $0 | 1,000 | 40-50% (rules compression) |
| **Developer** | $19/mo | 50,000 | 90%+ (full optimization) |
| **Team** | $49/mo | 200,000 | 90%+ + team features |

## Known Limitations

### Cloudflare-Proxied Downstream Servers (Error 1016)

If the downstream MCP server you're proxying is also behind Cloudflare's CDN proxy (orange-clouded), Cloudflare Workers will return a **1016 error** due to CDN loop detection. This is a Cloudflare platform restriction.

**Workarounds:**
- Use the **origin IP** of the downstream server (bypass its Cloudflare proxy)
- Use a downstream URL that is **not proxied** through Cloudflare (DNS-only / gray-clouded)
- Self-host the gateway worker on a non-Cloudflare platform

This does **not** affect downstream servers hosted on other platforms (AWS, GCP, Vercel, Railway, etc.).

## Architecture

- **Proxy Layer**: Cloudflare Workers (0ms cold start, global edge)
- **Storage**: Workers KV (API keys, usage stats)
- **Dashboard**: Next.js + Tailwind CSS on Vercel
- **Cost**: ~$0 at free tier volume

## Self-Hosting

### Worker

```bash
cd worker
npm install
cp wrangler.toml.example wrangler.toml  # Add your KV namespace IDs
npx wrangler deploy
```

### Dashboard

```bash
cd dashboard
npm install
npm run build
# Deploy to Vercel or any Node.js host
```

## Roadmap

- [x] V0.1: Rules-based compression (40-50% savings)
- [ ] V0.2: Semantic tool discovery (90%+ savings)
- [ ] V0.3: Result caching
- [ ] V0.4: Team workspaces
- [ ] V0.5: Custom compression rules

## License

MIT © [Vincentwei1021](https://github.com/Vincentwei1021)
