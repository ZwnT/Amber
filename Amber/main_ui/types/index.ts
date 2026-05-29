export interface Persona {
  id: string
  name: string
  gender: string
  relationship_desc: string
  impression: string
  avatar: string | null
  avatarData?: string
  token?: string
  core_memory: string
  traits: string[]
  catchphrases: string[]
  stability: number
  synchronization: number
  happiness: number
  anger: number
  anxiety: number
  is_override_active: boolean
  override_interval: number
  bot_app_id?: string
  bot_app_secret?: string
  bot_token?: string
  last_interaction_time?: string
  last_relay_context?: string
  // UI-only fields
  lastMessage?: string
  emotionStatus?: "amber" | "gray" | "red"
  tag?: string
  relationship?: string
  coreMemory?: string
}

export interface Message {
  id: string
  persona_id: string
  role: "user" | "assistant" | "system"
  content: string
  is_filtered: boolean
  timestamp: string
}

export interface MoodState {
  happiness: number
  anger: number
  anxiety: number
}

export interface APIConfig {
  apiKey: string
  baseUrl: string
  modelId: string
}

export interface SystemStatus {
  latency: number
  corpus_count: number
  janitor_speed: number
  stability: number
  janitor_test_mode: boolean
  logs: string[]
  current_mood?: MoodState
}

export interface CorpusEntry {
  id: number
  content: string
  weight: number
  is_pinned: boolean
  timestamp: string
}

export interface ChatResponse {
  message: Message
  user_message_id: string
  persona: MoodState
}
