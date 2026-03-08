import Link from "next/link";

const STATS = [
  { label: "Token Savings", value: "40-90%", icon: "⚡" },
  { label: "Latency Added", value: "<10ms", icon: "🚀" },
  { label: "Price", value: "Free", icon: "💰" },
  { label: "Setup Time", value: "30sec", icon: "⏱️" },
];

const STEPS = [
  { step: "1", title: "Register", desc: "Get your free API key — no credit card needed." },
  { step: "2", title: "Point your MCP client to our gateway", desc: "Replace your MCP server URL with our proxy URL." },
  { step: "3", title: "Save tokens automatically", desc: "Tool definitions are compressed on the fly. Check your dashboard for savings." },
];

const BEFORE_AFTER = `// Before: 75,000 tokens burned on tool definitions
{
  "name": "search_repositories",
  "description": "This tool allows you to search for repositories on GitHub.
    It provides a powerful way to find repositories based on various criteria
    including name, description, topics, language, stars, and more.
    For more information, see the GitHub API documentation.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The search query string to use for finding repositories"
      },
      "sort": {
        "type": "string",
        "description": "One of stars, forks, help-wanted-issues, or updated",
        "enum": ["stars", "forks", "help-wanted-issues", "updated"],
        "default": "stars"
      }
    }
  }
}

// After: compressed by MCP Token Gateway
{
  "name": "search_repositories",
  "description": "Search GitHub repositories by name, topic, language, or stars.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" },
      "sort": { "type": "string", "enum": ["stars","forks","help-wanted-issues","updated"] }
    }
  }
}`;

export default function Home() {
  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="text-xl font-bold tracking-tight">
            <span className="text-cyan-400">⚡</span> MCP Token Gateway
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Dashboard</Link>
            <Link href="/dashboard" className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-cyan-400 transition-colors">
              Get Free API Key →
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-sm font-medium text-cyan-400">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              Open Source &middot; Cloudflare Edge &middot; Free Tier
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              Cut <span className="text-cyan-400">90%</span> of Your{" "}
              <br className="hidden sm:block" />
              MCP Token Costs
            </h1>
            <p className="mt-6 text-lg text-gray-400 sm:text-xl leading-relaxed max-w-2xl mx-auto">
              MCP tool definitions burn <strong className="text-white">75,000+ tokens</strong> before your agent says a word.
              Our gateway compresses them automatically — zero config, zero code changes.
            </p>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-2xl mx-auto">
              {STATS.map((s) => (
                <div key={s.label} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center">
                  <div className="text-2xl">{s.icon}</div>
                  <div className="mt-1 text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/dashboard" className="rounded-xl bg-cyan-500 px-8 py-3.5 text-base font-bold text-gray-950 hover:bg-cyan-400 transition-all animate-pulse-glow">
                Start Free — 1,000 Calls/Day
              </Link>
              <a href="https://github.com/Vincentwei1021/mcp-token-gateway" target="_blank" className="rounded-xl border border-gray-700 bg-gray-900 px-8 py-3.5 text-base font-medium text-gray-300 hover:border-gray-600 hover:text-white transition-all">
                ⭐ GitHub
              </a>
            </div>
          </div>
        </section>

        {/* Before/After Code */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-3xl font-bold mb-8">
              See the <span className="text-cyan-400">Difference</span>
            </h2>
            <div className="rounded-2xl border border-gray-800 bg-gray-900/80 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-2.5">
                <span className="h-3 w-3 rounded-full bg-red-500/60" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <span className="h-3 w-3 rounded-full bg-green-500/60" />
                <span className="ml-2 text-xs text-gray-500 font-mono">tool-definition.json</span>
              </div>
              <pre className="overflow-x-auto p-6 text-sm leading-relaxed font-[family-name:var(--font-mono)] text-gray-300">
                <code>{BEFORE_AFTER}</code>
              </pre>
            </div>
            <p className="mt-4 text-center text-sm text-gray-500">
              ↑ Real example: <strong className="text-cyan-400">47% fewer tokens</strong> with zero functionality loss
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-3xl font-bold mb-12">
              How It <span className="text-cyan-400">Works</span>
            </h2>
            <div className="grid gap-8 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.step} className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20 text-lg font-bold text-cyan-400">{s.step}</div>
                  <h3 className="text-lg font-semibold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Config Example */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-bold mb-8">
              One-Line <span className="text-cyan-400">Config</span>
            </h2>
            <div className="rounded-2xl border border-gray-800 bg-gray-900/80 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-2.5">
                <span className="text-xs text-gray-500 font-mono">claude_desktop_config.json</span>
              </div>
              <pre className="overflow-x-auto p-6 text-sm leading-relaxed font-[family-name:var(--font-mono)] text-gray-300">
{`{
  "mcpServers": {
    "github": {
      // Before: direct connection
      // "url": "https://mcp.github.com/sse"

      // After: through MCP Token Gateway
      "url": "https://gateway.toolboxlite.com/sse/mtg_YOUR_KEY/https%3A%2F%2Fmcp.github.com%2Fsse"
    }
  }
}`}
              </pre>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-3xl font-bold mb-12">Simple <span className="text-cyan-400">Pricing</span></h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                { name: "Free", price: "$0", desc: "forever", calls: "1,000/day", features: ["Basic compression (40-50%)", "1 workspace", "Community support"] },
                { name: "Developer", price: "$19", desc: "/month", calls: "50,000/day", features: ["Full optimization (90%+)", "Usage dashboard", "3 workspaces", "Email support"], popular: true },
                { name: "Team", price: "$49", desc: "/month", calls: "200,000/day", features: ["Everything in Developer", "10 team members", "Savings reports", "Slack integration"] },
              ].map((p) => (
                <div key={p.name} className={`rounded-xl border p-6 ${p.popular ? "border-cyan-500/50 bg-cyan-500/5 ring-1 ring-cyan-500/20" : "border-gray-800 bg-gray-900/50"}`}>
                  {p.popular && <div className="mb-3 text-xs font-bold text-cyan-400 uppercase tracking-wider">Most Popular</div>}
                  <div className="text-lg font-semibold text-white">{p.name}</div>
                  <div className="mt-2"><span className="text-3xl font-extrabold text-white">{p.price}</span><span className="text-gray-500">{p.desc}</span></div>
                  <div className="mt-1 text-sm text-gray-500">{p.calls} calls</div>
                  <ul className="mt-4 space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-400"><span className="text-cyan-400">✓</span>{f}</li>
                    ))}
                  </ul>
                  <Link href="/dashboard" className={`mt-6 block rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-all ${p.popular ? "bg-cyan-500 text-gray-950 hover:bg-cyan-400" : "border border-gray-700 text-gray-300 hover:border-gray-600"}`}>
                    {p.price === "$0" ? "Start Free" : "Get Started"}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-4 py-8 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} MCP Token Gateway. Open source on <a href="https://github.com/Vincentwei1021/mcp-token-gateway" className="text-cyan-400 hover:underline">GitHub</a>.</p>
      </footer>
    </>
  );
}
