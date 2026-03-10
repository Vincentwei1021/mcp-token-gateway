import Link from "next/link";

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="text-xl font-bold tracking-tight">
            <span className="text-cyan-400">⚡</span> MCP Control Plane
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Dashboard</Link>
            <Link href="/dashboard" className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-cyan-400 transition-colors">
              Get Started Free →
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
              One Gateway for{" "}
              <span className="text-cyan-400">All Your MCP Servers</span>
            </h1>
            <p className="mt-6 text-lg text-gray-400 sm:text-xl leading-relaxed max-w-2xl mx-auto">
              Stop juggling 10 MCP server URLs. Register your servers, create profiles, and give your AI client <strong className="text-white">one endpoint</strong> that routes to everything.
              Plus automatic <strong className="text-white">token compression</strong>.
            </p>

            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-2xl mx-auto">
              {[
                { label: "Setup", value: "30sec", icon: "⏱️" },
                { label: "Token Savings", value: "40-90%", icon: "⚡" },
                { label: "Servers", value: "Unlimited", icon: "🖥️" },
                { label: "Price", value: "Free", icon: "💰" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center">
                  <div className="text-2xl">{s.icon}</div>
                  <div className="mt-1 text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/dashboard" className="rounded-xl bg-cyan-500 px-8 py-3.5 text-base font-bold text-gray-950 hover:bg-cyan-400 transition-all">
                Start Free →
              </Link>
              <a href="https://github.com/Vincentwei1021/mcp-token-gateway" target="_blank" className="rounded-xl border border-gray-700 bg-gray-900 px-8 py-3.5 text-base font-medium text-gray-300 hover:border-gray-600 hover:text-white transition-all">
                ⭐ GitHub
              </a>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-3xl font-bold mb-12">How It <span className="text-cyan-400">Works</span></h2>
            <div className="grid gap-8 sm:grid-cols-3">
              {[
                { step: "1", title: "Add Servers", desc: "Register your MCP servers — GitHub, Slack, Postgres, anything. Set name, URL, and auth." },
                { step: "2", title: "Create Profiles", desc: 'Group servers into profiles like "Code" or "Business". Switch profiles instantly.' },
                { step: "3", title: "Connect Once", desc: "Point your AI client to one Gateway URL. It routes tools/list and tools/call to the right server." },
              ].map((s) => (
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
            <h2 className="text-center text-3xl font-bold mb-8">One-Line <span className="text-cyan-400">Config</span></h2>
            <div className="rounded-2xl border border-gray-800 bg-gray-900/80 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-2.5">
                <span className="h-3 w-3 rounded-full bg-red-500/60" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <span className="h-3 w-3 rounded-full bg-green-500/60" />
                <span className="ml-2 text-xs text-gray-500 font-mono">claude_desktop_config.json</span>
              </div>
              <pre className="overflow-x-auto p-6 text-sm leading-relaxed font-[family-name:var(--font-mono)] text-gray-300">
{`{
  "mcpServers": {
    // Before: 10 separate server entries
    // "github": { "url": "https://..." },
    // "slack":  { "url": "https://..." },
    // "postgres": { "url": "https://..." },
    // ...

    // After: one gateway replaces them all
    "gateway": {
      "url": "https://gateway.toolboxlite.com/gw/mtg_YOUR_KEY"
    }
  }
}`}
              </pre>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-3xl font-bold mb-12">What You <span className="text-cyan-400">Get</span></h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {[
                { icon: "🖥️", title: "Server Registry", desc: "Add unlimited MCP servers with name, URL, and auth config. Edit or remove anytime." },
                { icon: "📁", title: "Profile Switching", desc: 'Group servers into profiles. "Code" profile for dev servers, "Business" for CRM and email.' },
                { icon: "⚡", title: "Token Compression", desc: "Tool descriptions are automatically compressed, saving 40-90% of context tokens." },
                { icon: "📈", title: "Usage Analytics", desc: "See which tools are called, how often, latency, and error rates — all in your dashboard." },
                { icon: "🔐", title: "Auth Passthrough", desc: "Bearer tokens and custom headers are securely forwarded to upstream servers." },
                { icon: "🌍", title: "Edge Deployed", desc: "Cloudflare Workers in 300+ cities. <10ms overhead, 0 cold start." },
              ].map((f) => (
                <div key={f.title} className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
                  <span className="text-2xl">{f.icon}</span>
                  <h3 className="mt-2 font-semibold text-white">{f.title}</h3>
                  <p className="mt-1 text-sm text-gray-400">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-800 px-4 py-8 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} MCP Control Plane. Open source on <a href="https://github.com/Vincentwei1021/mcp-token-gateway" className="text-cyan-400 hover:underline">GitHub</a>.</p>
      </footer>
    </>
  );
}
