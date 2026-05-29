"use client"

import { useState, useCallback } from "react"
import { personaApi } from "@/lib/api"
import type { Persona } from "@/types"

function mapPersona(p: Persona): Persona {
  return {
    ...p,
    avatar: p.avatar ? "" : "✨",
    avatarData: p.avatar ?? undefined,
    lastMessage: "就绪...",
    emotionStatus: "amber" as const,
    tag: p.relationship_desc || "分身",
    gender: p.gender === "male" ? "男" : p.gender === "female" ? "女" : "非线性",
    relationship: p.relationship_desc,
    impression: p.impression,
    coreMemory: p.core_memory,
  } as Persona
}

export function usePersonas() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const data = await personaApi.list()
      setPersonas(data.map(mapPersona))
    } catch (e) {
      console.error("fetchPersonas:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (data: Parameters<typeof personaApi.create>[0]) => {
    const p = await personaApi.create(data)
    const mapped = mapPersona(p)
    setPersonas((prev) => [...prev, mapped])
    return mapped
  }, [])

  const update = useCallback(async (id: string, data: Partial<Persona>) => {
    const p = await personaApi.update(id, data)
    const mapped = mapPersona(p)
    setPersonas((prev) => prev.map((x) => (x.id === id ? mapped : x)))
    return mapped
  }, [])

  const remove = useCallback(async (id: string) => {
    await personaApi.delete(id)
    setPersonas((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const updateMood = useCallback((id: string, mood: { happiness: number; anger: number; anxiety: number }) => {
    setPersonas((prev) =>
      prev.map((x) => (x.id === id ? { ...x, ...mood } : x))
    )
  }, [])

  return { personas, loading, fetchAll, create, update, remove, updateMood }
}
