"use client"

import { useState, useEffect } from "react"
import { IconSidebar } from "@/components/amber/icon-sidebar"
import { PersonaRoster } from "@/components/amber/persona-roster"
import { ChatWorkspace } from "@/components/amber/chat-workspace"
import { DistillationModal } from "@/components/DistillationModal"
import { PlaceholderView } from "@/components/amber/placeholder-views"
import { BotConfigModal } from "@/components/BotConfigModal"
import { DataMonitor } from "@/components/amber/DataMonitor"
import { IdentityDetail } from "@/components/amber/IdentityDetail"
import { WindowControls } from "@/components/amber/window-controls"
import { SettingsCenter } from "@/components/amber/SettingsCenter"
import { TRANSLATIONS } from "@/lib/i18n"
import { usePersonas } from "@/hooks/usePersonas"
import { useChat } from "@/hooks/useChat"
import { useSettings } from "@/hooks/useSettings"
import type { MoodState } from "@/types"

export default function AmberApp() {
  const [activeTab, setActiveTab] = useState("chat")
  const [viewMode, setViewMode] = useState<"chat" | "profile">("chat")
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [isBotConfigOpen, setIsBotConfigOpen] = useState(false)

  const { personas, loading, fetchAll, create, remove, updateMood } = usePersonas()
  const { apiConfig, language, setLanguage, userAvatar, saveAvatar, reset } = useSettings()

  const handleMoodUpdate = (mood: MoodState) => {
    if (selectedPersonaId) updateMood(selectedPersonaId, mood)
  }

  const { messages, sending, sendMessage } = useChat(selectedPersonaId, handleMoodUpdate)

  const t = TRANSLATIONS[language] || TRANSLATIONS.zh

  // Initial data load
  useEffect(() => { fetchAll() }, [fetchAll])

  // Auto-select first persona
  useEffect(() => {
    if (!selectedPersonaId && personas.length > 0) {
      setSelectedPersonaId(personas[0].id)
    }
  }, [personas, selectedPersonaId])

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId) ?? null

  // Map API messages to the format ChatWorkspace expects
  const chatMessages = messages.map((m) => ({
    id: m.id,
    content: m.content,
    sender: m.role === "user" ? "user" : "ai",
    timestamp: new Date(m.timestamp),
  })) as any[]

  const handleSend = (content: string) => sendMessage(content, apiConfig)

  const handleWizardComplete = async (personaData: any) => {
    await create(personaData)
    setIsWizardOpen(false)
    fetchAll()
  }

  const handleDeletePersona = async (id: string) => {
    await remove(id)
    if (selectedPersonaId === id) {
      setSelectedPersonaId(personas.find((p) => p.id !== id)?.id ?? null)
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background select-none">
      <WindowControls />

      <div className="flex-1 flex overflow-hidden relative">
        <IconSidebar
          activeItem={activeTab}
          onItemClick={(item: string) => {
            setActiveTab(item)
            if (item === "chat") setViewMode("chat")
          }}
          t={t}
        />

        {activeTab === "chat" ? (
          <>
            <PersonaRoster
              personas={personas}
              selectedId={selectedPersonaId}
              onSelect={(id: string) => { setSelectedPersonaId(id); setViewMode("chat") }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              t={t}
            />

            {viewMode === "chat" ? (
              <ChatWorkspace
                persona={selectedPersona}
                messages={chatMessages}
                onSendMessage={handleSend}
                onOpenConfig={() => setIsBotConfigOpen(true)}
                onOpenProfile={() => setViewMode("profile")}
                t={t}
              />
            ) : (
              <IdentityDetail
                persona={selectedPersona}
                onBack={() => setViewMode("chat")}
                onDelete={handleDeletePersona}
                onUpdate={fetchAll}
                language={language}
              />
            )}
          </>
        ) : activeTab === "monitor" ? (
          <DataMonitor activePersonaId={selectedPersonaId} language={language} />
        ) : activeTab === "settings" ? (
          <SettingsCenter
            userAvatar={userAvatar}
            onSaveAvatar={saveAvatar}
            onReset={reset}
            language={language}
            setLanguage={setLanguage}
          />
        ) : (
          <PlaceholderView />
        )}
      </div>

      <DistillationModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={handleWizardComplete}
      />

      <BotConfigModal
        isOpen={isBotConfigOpen}
        onClose={() => setIsBotConfigOpen(false)}
        persona={selectedPersona}
        language={language}
      />
    </div>
  )
}
