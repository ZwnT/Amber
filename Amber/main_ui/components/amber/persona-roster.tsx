"use client"

import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Persona } from "@/types"

export type { Persona }

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
                  emotionColors[persona.emotionStatus ?? "gray"]
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
