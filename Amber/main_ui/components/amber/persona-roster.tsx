/**
 * Copyright 2025 ZwnT
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use client"

import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Persona {
  id: string
  name: string
  avatar: string
  avatarData?: string // 用于存储 base64 图片数据
  lastMessage: string
  emotionStatus: "amber" | "gray" | "red"
  tag: string
  gender?: string
  relationship?: string
  impression?: string
  token?: string // 绑定的平台 Token
  coreMemory?: string
  traits?: string[]
  catchphrases?: string[]
  stability?: number
  synchronization?: number
  happiness?: number
  anger?: number
  anxiety?: number
  is_override_active?: boolean
  override_interval?: number
  last_interaction_time?: string
  bot_app_id?: string
  bot_app_secret?: string
  bot_token?: string
}

interface PersonaRosterProps {
  personas: Persona[]
  selectedId: string | null
  onSelect: (id: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  t: any
}

const emotionColors = {
  amber: "bg-amber-500 shadow-[0_0_6px_2px_rgba(245,158,11,0.5)]",
  gray: "bg-gray-400",
  red: "bg-red-500 shadow-[0_0_6px_2px_rgba(239,68,68,0.4)]",
}

export function PersonaRoster({
  personas,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
  t,
}: PersonaRosterProps) {
  const filteredPersonas = personas.filter((persona) =>
    persona.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-72 h-full bg-card border-r border-border flex flex-col">
      {/* Search Bar */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-secondary rounded-lg border-0 outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 transition-all"
          />
        </div>
      </div>

      {/* Persona List */}
      <div className="flex-1 overflow-y-auto">
        {filteredPersonas.map((persona) => (
          <button
            key={persona.id}
            onClick={() => onSelect(persona.id)}
            className={cn(
              "w-full px-3 py-3 flex items-center gap-3 transition-all duration-150 text-left",
              "hover:bg-secondary/60",
              selectedId === persona.id && "bg-secondary"
            )}
          >
            {/* Avatar with Emotion Indicator */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg overflow-hidden">
                {persona.avatarData ? (
                  <img src={persona.avatarData} alt={persona.name} className="w-full h-full object-cover" />
                ) : (
                  persona.avatar
                )}
              </div>
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                  emotionColors[persona.emotionStatus]
                )}
              />
            </div>

            {/* Name and Message */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {persona.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {persona.lastMessage}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
