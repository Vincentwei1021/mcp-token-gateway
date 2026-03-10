/**
 * Server Registry + Profile Management — KV-backed CRUD
 */
import type { Env, MCPServer, Profile } from "./types";
import { generateId } from "./auth";

// ── Servers ──

export async function listServers(env: Env, userId: string): Promise<MCPServer[]> {
  const data = await env.KV.get(`servers:${userId}`);
  return data ? JSON.parse(data) : [];
}

export async function addServer(env: Env, userId: string, input: {
  name: string;
  url: string;
  transport?: "http" | "sse";
  authType?: "none" | "bearer" | "header";
  authValue?: string;
  authHeader?: string;
}): Promise<MCPServer> {
  const servers = await listServers(env, userId);
  if (servers.length >= 20) throw new Error("Maximum 20 servers per account");

  const server: MCPServer = {
    id: generateId(),
    name: input.name.trim(),
    url: input.url.trim(),
    transport: input.transport || "sse",
    authType: input.authType || "none",
    authValue: input.authValue,
    authHeader: input.authHeader,
    createdAt: new Date().toISOString(),
  };

  servers.push(server);
  await env.KV.put(`servers:${userId}`, JSON.stringify(servers));
  return server;
}

export async function updateServer(env: Env, userId: string, serverId: string, updates: Partial<MCPServer>): Promise<MCPServer | null> {
  const servers = await listServers(env, userId);
  const idx = servers.findIndex((s) => s.id === serverId);
  if (idx === -1) return null;

  const server = { ...servers[idx], ...updates, id: serverId };
  servers[idx] = server;
  await env.KV.put(`servers:${userId}`, JSON.stringify(servers));
  return server;
}

export async function deleteServer(env: Env, userId: string, serverId: string): Promise<boolean> {
  const servers = await listServers(env, userId);
  const filtered = servers.filter((s) => s.id !== serverId);
  if (filtered.length === servers.length) return false;

  await env.KV.put(`servers:${userId}`, JSON.stringify(filtered));

  // Also remove from all profiles
  const profiles = await listProfiles(env, userId);
  let changed = false;
  for (const p of profiles) {
    const before = p.serverIds.length;
    p.serverIds = p.serverIds.filter((id) => id !== serverId);
    if (p.serverIds.length !== before) changed = true;
  }
  if (changed) {
    await env.KV.put(`profiles:${userId}`, JSON.stringify(profiles));
  }

  return true;
}

// ── Profiles ──

export async function listProfiles(env: Env, userId: string): Promise<Profile[]> {
  const data = await env.KV.get(`profiles:${userId}`);
  return data ? JSON.parse(data) : [];
}

export async function createProfile(env: Env, userId: string, input: {
  name: string;
  serverIds: string[];
}): Promise<Profile> {
  const profiles = await listProfiles(env, userId);
  if (profiles.length >= 10) throw new Error("Maximum 10 profiles per account");

  const profile: Profile = {
    id: generateId(),
    name: input.name.trim(),
    serverIds: input.serverIds,
    createdAt: new Date().toISOString(),
  };

  profiles.push(profile);
  await env.KV.put(`profiles:${userId}`, JSON.stringify(profiles));
  return profile;
}

export async function updateProfile(env: Env, userId: string, profileId: string, updates: { name?: string; serverIds?: string[] }): Promise<Profile | null> {
  const profiles = await listProfiles(env, userId);
  const idx = profiles.findIndex((p) => p.id === profileId);
  if (idx === -1) return null;

  if (updates.name !== undefined) profiles[idx].name = updates.name.trim();
  if (updates.serverIds !== undefined) profiles[idx].serverIds = updates.serverIds;

  await env.KV.put(`profiles:${userId}`, JSON.stringify(profiles));
  return profiles[idx];
}

export async function deleteProfile(env: Env, userId: string, profileId: string): Promise<boolean> {
  const profiles = await listProfiles(env, userId);
  const filtered = profiles.filter((p) => p.id !== profileId);
  if (filtered.length === profiles.length) return false;
  await env.KV.put(`profiles:${userId}`, JSON.stringify(filtered));
  return true;
}

// ── Active Profile ──

export async function getActiveProfile(env: Env, apiKey: string): Promise<string | null> {
  return env.KV.get(`active_profile:${apiKey}`);
}

export async function setActiveProfile(env: Env, apiKey: string, profileId: string): Promise<void> {
  await env.KV.put(`active_profile:${apiKey}`, profileId);
}

// ── Helpers ──

export async function getServersForProfile(env: Env, userId: string, profileId: string): Promise<MCPServer[]> {
  const [servers, profiles] = await Promise.all([
    listServers(env, userId),
    listProfiles(env, userId),
  ]);

  const profile = profiles.find((p) => p.id === profileId);
  if (!profile) return [];

  const idSet = new Set(profile.serverIds);
  return servers.filter((s) => idSet.has(s.id));
}
