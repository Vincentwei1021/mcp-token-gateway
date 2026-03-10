"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/dashboard/servers", label: "Servers", icon: "🖥️" },
  { href: "/dashboard/profiles", label: "Profiles", icon: "📁" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "📈" },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { session, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="text-lg font-bold"><span className="text-cyan-400">⚡</span> MCP Control Plane</Link>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-xs text-gray-500">{session?.email}</span>
            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-400 uppercase">{session?.plan}</span>
            <button onClick={logout} className="text-sm text-gray-400 hover:text-white transition-colors">Logout</button>
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Tab navigation */}
        <div className="mb-6 flex gap-1 rounded-lg border border-gray-800 bg-gray-900/50 p-1">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}
              className={`flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-all ${
                pathname === item.href
                  ? "bg-gray-800 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}>
              <span className="mr-1.5">{item.icon}</span>{item.label}
            </Link>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}
