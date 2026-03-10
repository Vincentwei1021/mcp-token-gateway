export interface Env {
  KV: KVNamespace;
  ENVIRONMENT: string;
}

/** Wrapper to collect waitUntil promises for usage tracking */
export interface ProxyContext {
  env: Env;
  waitUntil: (promise: Promise<any>) => void;
}

// ── Auth ──

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  plan: "free" | "developer" | "team" | "pro";
  createdAt: string;
}

export interface ApiKey {
  key: string;
  userId: string;
  name: string;
  createdAt: string;
  enabled: boolean;
}

// ── Server Registry ──

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  transport: "http" | "sse";
  authType: "none" | "bearer" | "header";
  authValue?: string;
  authHeader?: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  name: string;
  serverIds: string[];
  createdAt: string;
}

// ── Tool Mapping ──

export interface ToolMapping {
  [toolName: string]: {
    serverId: string;
    serverUrl: string;
    serverTransport: "http" | "sse";
    serverAuthType: "none" | "bearer" | "header";
    serverAuthValue?: string;
    serverAuthHeader?: string;
  };
}

// ── Call Logging ──

export interface CallRecord {
  timestamp: string;
  tool: string;
  serverId: string;
  serverName: string;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  tokensEstimated: number;
}

// ── Usage ──

export interface UsageRecord {
  date: string;
  requests: number;
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;
}

export interface DailyCallStats {
  date: string;
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  avgLatencyMs: number;
  byServer: Record<string, number>;
  byTool: Record<string, number>;
}

// ── MCP Protocol ──

export interface MCPToolDefinition {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    [key: string]: any;
  };
  [key: string]: any;
}

export interface MCPRequest {
  jsonrpc: "2.0";
  id?: number | string;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: string;
  id?: number | string;
  result?: {
    tools?: MCPToolDefinition[];
    [key: string]: any;
  };
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  [key: string]: any;
}
