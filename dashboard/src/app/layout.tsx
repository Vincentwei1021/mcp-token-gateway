import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", weight: ["400","500","600","700","800"] });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400","500","600"] });

export const metadata: Metadata = {
  title: "MCP Control Plane — One Gateway for All Your MCP Servers",
  description: "Lightweight MCP control plane for indie devs. Register servers, create profiles, and manage all your MCP tools through one gateway endpoint. Free tier available.",
  keywords: ["MCP", "control plane", "MCP gateway", "tool management", "Claude", "Cursor", "AI agent"],
  openGraph: {
    title: "MCP Control Plane — One Gateway for All Your MCP Servers",
    description: "Stop juggling MCP server URLs. Register, group, and route tools through one endpoint. Free tier available.",
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
