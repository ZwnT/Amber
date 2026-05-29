import type { Persona, Message, MoodState, APIConfig, SystemStatus, CorpusEntry, ChatResponse } from "@/types"

const BASE = "http://127.0.0.1:8000"

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

const get = <T>(path: string) => req<T>("GET", path)
const post = <T>(path: string, body: unknown) => req<T>("POST", path, body)
const put = <T>(path: string, body: unknown) => req<T>("PUT", path, body)
const del = <T>(path: string) => req<T>("DELETE", path)

// ─── Personas ───────────────────────────────────────────────────────────────
export const personaApi = {
  list: () => get<Persona[]>("/api/personas"),
  create: (data: Partial<Persona> & { raw_corpus?: string }) => post<Persona>("/api/personas", data),
  update: (id: string, data: Partial<Persona>) => put<Persona>(`/api/personas/${id}`, data),
  delete: (id: string) => del<{ message: string }>(`/api/personas/${id}`),
  clearHistory: (persona_id: string) => post<{ status: string }>("/api/persona/clear-history", { persona_id }),
  redistill: (data: {
    persona_id: string; name: string; avatar?: string; core_memory: string
    traits_map: Record<string, number>; api_key?: string; base_url?: string; model_id?: string
  }) => post<{ core_memory: string; stability: number; synchronization: number; refined_traits: string[] }>("/api/persona/redistill", data),
  commitUpdate: (data: {
    persona_id: string; name: string; avatar?: string; core_memory: string
    traits?: string[]; stability?: number; synchronization?: number
  }) => post<{ status: string; persona: Partial<Persona> }>("/api/persona/commit-update", data),
}

// ─── Chat ────────────────────────────────────────────────────────────────────
export const chatApi = {
  history: (personaId: string) => get<Message[]>(`/api/chat/${personaId}`),
  send: (personaId: string, content: string, config: Partial<APIConfig>) =>
    post<ChatResponse>(`/api/chat/${personaId}`, {
      content,
      api_key: config.apiKey,
      base_url: config.baseUrl,
      model_id: config.modelId,
    }),
}

// ─── System ──────────────────────────────────────────────────────────────────
export const systemApi = {
  health: () => get<{ status: string }>("/api/health"),
  status: (personaId?: string) =>
    get<SystemStatus>(`/api/system/status${personaId ? `?persona_id=${personaId}` : ""}`),
  config: (cfg: Record<string, unknown>) => post<{ status: string }>("/api/system/config", cfg),
  reset: () => post<{ status: string }>("/api/system/reset", {}),
  janitorTestMode: (enabled: boolean) =>
    post<{ status: string; janitor_test_mode: boolean }>(`/api/system/janitor-test-mode?enabled=${enabled}`, {}),
}

// ─── Memory ──────────────────────────────────────────────────────────────────
export const memoryApi = {
  list: (personaId: string) => get<CorpusEntry[]>(`/api/system/memory/${personaId}`),
  charge: (corpus_id: number) => post<{ status: string; weight: number }>("/api/system/memory/charge", { corpus_id }),
  togglePin: (corpus_id: number) =>
    post<{ status: string; is_pinned: boolean; weight: number }>("/api/system/memory/toggle-pin", { corpus_id }),
  erase: (corpus_id: number) => del<{ status: string }>(`/api/system/memory/erase/${corpus_id}`),
}

// ─── Relay ───────────────────────────────────────────────────────────────────
export const relayApi = {
  test: (data: { bot_type: string; appid: string; secret: string }) =>
    post<{ status: string; message: string }>("/api/relay/test", data),
  connect: (data: {
    bot_type: string; appid: string; secret: string; persona_id: string
    api_key?: string; base_url?: string; model_id?: string
  }) => post<{ status: string; persona_id: string }>("/api/relay/connect", data),
  disconnect: (persona_id: string) =>
    post<{ status: string }>(`/api/relay/disconnect?persona_id=${persona_id}`, {}),
  status: (persona_id: string) =>
    get<{ is_connected: boolean; appid: string }>(`/api/relay/status/${persona_id}`),
}

// ─── WebSocket ───────────────────────────────────────────────────────────────
export const WS_BASE = "ws://127.0.0.1:8000"

export function createPersonaWebSocket(personaId: string): WebSocket {
  return new WebSocket(`${WS_BASE}/ws/${personaId}`)
}
