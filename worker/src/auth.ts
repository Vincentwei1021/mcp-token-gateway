/**
 * Auth & API Key management via KV
 */
import type { Env, User, ApiKey } from "./types";

export function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateApiKey(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return "mtg_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function registerUser(env: Env, email: string, password: string): Promise<{ user: User; apiKey: string }> {
  // Check existing
  const existing = await env.KV.get(`user:${email}`);
  if (existing) throw new Error("Email already registered");

  const userId = generateId();
  const user: User = {
    id: userId,
    email,
    passwordHash: await hashPassword(password),
    plan: "free",
    createdAt: new Date().toISOString(),
  };

  const apiKey = generateApiKey();
  const keyRecord: ApiKey = {
    key: apiKey,
    userId,
    name: "Default",
    createdAt: new Date().toISOString(),
    enabled: true,
  };

  await env.KV.put(`user:${email}`, JSON.stringify(user));
  await env.KV.put(`user_id:${userId}`, email);
  await env.KV.put(`apikey:${apiKey}`, JSON.stringify(keyRecord));
  await env.KV.put(`user_keys:${userId}`, JSON.stringify([apiKey]));

  return { user, apiKey };
}

export async function loginUser(env: Env, email: string, password: string): Promise<{ user: User; apiKeys: string[] }> {
  const data = await env.KV.get(`user:${email}`);
  if (!data) throw new Error("Invalid credentials");

  const user: User = JSON.parse(data);
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) throw new Error("Invalid credentials");

  const keysData = await env.KV.get(`user_keys:${user.id}`);
  const apiKeys = keysData ? JSON.parse(keysData) : [];

  return { user, apiKeys };
}

export async function validateApiKey(env: Env, apiKey: string): Promise<ApiKey | null> {
  const data = await env.KV.get(`apikey:${apiKey}`);
  if (!data) return null;
  const key: ApiKey = JSON.parse(data);
  return key.enabled ? key : null;
}

export async function getUsage(env: Env, apiKey: string, days: number = 7): Promise<any[]> {
  const usage: any[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split("T")[0];
    const data = await env.KV.get(`usage:${apiKey}:${date}`);
    if (data) usage.push(JSON.parse(data));
    else usage.push({ date, requests: 0, tokensBefore: 0, tokensAfter: 0, tokensSaved: 0 });
  }
  return usage.reverse();
}

export async function trackUsage(env: Env, apiKey: string, tokensBefore: number, tokensAfter: number): Promise<void> {
  const date = new Date().toISOString().split("T")[0];
  const key = `usage:${apiKey}:${date}`;
  const existing = await env.KV.get(key);
  const record = existing
    ? JSON.parse(existing)
    : { date, requests: 0, tokensBefore: 0, tokensAfter: 0, tokensSaved: 0 };

  record.requests++;
  record.tokensBefore += tokensBefore;
  record.tokensAfter += tokensAfter;
  record.tokensSaved += tokensBefore - tokensAfter;

  await env.KV.put(key, JSON.stringify(record), { expirationTtl: 90 * 86400 }); // 90 day retention
}
