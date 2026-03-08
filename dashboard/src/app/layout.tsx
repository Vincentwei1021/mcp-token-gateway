import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", weight: ["400","500","600","700","800"] });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400","500","600"] });

export const metadata: Metadata = {
  title: "MCP Token Gateway — Cut 40-90% of MCP Tool Token Overhead",
  description: "Lightweight proxy that compresses MCP tool definitions, saving 40-90% token costs. Free tier, zero config, Cloudflare edge.",
  keywords: ["MCP", "token optimization", "MCP gateway", "tool compression", "Claude", "Cursor", "AI agent"],
  openGraph: {
    title: "MCP Token Gateway — Cut MCP Token Costs by 40-90%",
    description: "Proxy your MCP connections through our gateway. Tool definitions get compressed automatically. Free tier available.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${jetbrains.variable} font-sans antialiased bg-gray-950 text-gray-100`}>
        {children}
      </body>
    </html>
  );
}
