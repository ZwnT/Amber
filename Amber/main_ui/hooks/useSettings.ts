"use client"

import { useState, useEffect, useCallback } from "react"
import type { APIConfig } from "@/types"

const STORAGE_KEY = "amber_global_api"
const LANG_KEY = "amber_language"
const AVATAR_KEY = "amber_user_avatar"

function loadConfig(): Partial<APIConfig> {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")
  } catch {
    return {}
  }
}

export function useSettings() {
  const [apiConfig, setApiConfigState] = useState<Partial<APIConfig>>(loadConfig)
  const [language, setLanguageState] = useState<string>("zh")
  const [userAvatar, setUserAvatarState] = useState<string>("")

  useEffect(() => {
    const lang = localStorage.getItem(LANG_KEY) ?? "zh"
    const avatar = localStorage.getItem(AVATAR_KEY) ?? ""
    setLanguageState(lang)
    setUserAvatarState(avatar)
  }, [])

  const saveApiConfig = useCallback((cfg: Partial<APIConfig>) => {
    setApiConfigState(cfg)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
  }, [])

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang)
    localStorage.setItem(LANG_KEY, lang)
  }, [])

  const saveAvatar = useCallback((avatar: string) => {
    setUserAvatarState(avatar)
    localStorage.setItem(AVATAR_KEY, avatar)
  }, [])

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setApiConfigState({})
  }, [])

  return { apiConfig, saveApiConfig, language, setLanguage, userAvatar, saveAvatar, reset }
}
