export interface Env {
  KV: KVNamespace;
  ENVIRONMENT: string;
}

/** Wrapper to collect waitUntil promises for usage tracking */
export interface ProxyContext {
  env: Env;
  waitUntil: (promise: Promise<any>) => void;
}

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

export interface UsageRecord {
  date: string;
  requests: number;
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;
}

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

export interface MCPResponse {
  jsonrpc: string;
  id?: number | string;
  result?: {
    tools?: MCPToolDefinition[];
    [key: string]: any;
  };
  [key: string]: any;
}
