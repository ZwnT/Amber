"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { chatApi, createPersonaWebSocket } from "@/lib/api"
import type { Message, MoodState, APIConfig } from "@/types"

interface UseChatReturn {
  messages: Message[]
  mood: MoodState | null
  sending: boolean
  sendMessage: (content: string, config: Partial<APIConfig>) => Promise<void>
}

export function useChat(personaId: string | null, onMoodUpdate?: (mood: MoodState) => void): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [mood, setMood] = useState<MoodState | null>(null)
  const [sending, setSending] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  // Load history + open WebSocket when personaId changes
  useEffect(() => {
    if (!personaId) {
      setMessages([])
      setMood(null)
      return
    }

    // Fetch existing history
    chatApi.history(personaId)
      .then((history) => setMessages(history))
      .catch((e) => console.error("history fetch:", e))

    // Open WebSocket
    const ws = createPersonaWebSocket(personaId)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data)
        if (type === "message") {
          setMessages((prev) => {
            // Deduplicate by id
            if (prev.some((m) => m.id === data.id)) return prev
            return [...prev, data as Message]
          })
        } else if (type === "mood") {
          const m = data as MoodState
          setMood(m)
          onMoodUpdate?.(m)
        }
      } catch {
        // ignore malformed frames
      }
    }

    ws.onerror = () => console.warn("WebSocket error for persona", personaId)

    // Keepalive ping every 25s
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send("ping")
    }, 25000)

    return () => {
      clearInterval(ping)
      ws.close()
      wsRef.current = null
    }
  }, [personaId])

  const sendMessage = useCallback(async (content: string, config: Partial<APIConfig>) => {
    if (!personaId || !content.trim()) return
    setSending(true)

    // Optimistic local user message
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      persona_id: personaId,
      role: "user",
      content,
      is_filtered: false,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempMsg])

    try {
      const res = await chatApi.send(personaId, content, config)
      // Remove the temp message and add real user + AI messages from server
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== tempMsg.id)
        const userMsg: Message = {
          id: res.user_message_id,
          persona_id: personaId,
          role: "user",
          content,
          is_filtered: false,
          timestamp: new Date().toISOString(),
        }
        // The AI message arrives via WebSocket; add user message here
        const alreadyHasUser = without.some((m) => m.id === res.user_message_id)
        return alreadyHasUser ? without : [...without, userMsg]
      })
    } catch (e) {
      console.error("sendMessage:", e)
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id))
    } finally {
      setSending(false)
    }
  }, [personaId])

  return { messages, mood, sending, sendMessage }
}
