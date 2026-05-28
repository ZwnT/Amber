"use client"

import { useState, useRef, useEffect } from "react"
import { Paperclip, Mic, Send, Settings, User, Sparkles, FileUser } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Persona } from "./persona-roster"

interface Message {
  id: string
  content: string
  sender: "user" | "ai"
  timestamp: Date
}

interface ChatWorkspaceProps {
  persona: Persona | null
  messages: Message[]
  onSendMessage: (content: string) => void
  onOpenConfig?: () => void
  onOpenProfile?: () => void
  t: any
}

export function ChatWorkspace({
  persona,
  messages,
  onSendMessage,
  onOpenConfig,
  onOpenProfile,
  t,
}: ChatWorkspaceProps) {
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim())
      setInputValue("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!persona) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-amber-subtle mx-auto mb-4 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-medium text-foreground mb-1">
            {t.welcome || "欢迎使用 Amber"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.selectPersona || "选择一个数字人格开始对话"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header - WeChat Style Layout */}
      <header className="h-14 px-5 border-b border-border flex items-center justify-between bg-card">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button 
            onClick={onOpenProfile}
            className="w-8 h-8 rounded-full bg-amber-subtle flex items-center justify-center text-sm border border-border hover:ring-2 hover:ring-primary/30 transition-all overflow-hidden shrink-0"
            title={t.viewDetails || "查看详情"}
          >
            {persona.avatarData ? (
              <img src={persona.avatarData} alt={persona.name} className="w-full h-full object-cover" />
            ) : (
              persona.avatar || "👤"
            )}
          </button>
          <div 
            className="flex items-center gap-2 cursor-pointer group min-w-0"
            onClick={onOpenProfile}
          >
            <h1 className="text-base font-medium text-foreground group-hover:text-primary transition-colors truncate">
              {persona.name}
            </h1>
            <span className="px-2 py-0.5 text-[10px] bg-secondary text-muted-foreground rounded uppercase tracking-wider shrink-0">
              {persona.tag}
            </span>
          </div>

          {/* Emotion Indicators */}
          <div className="flex items-center gap-3 ml-2 border-l border-border pl-3 shrink-0">
            <div className="flex items-center gap-1.5" title={`Happiness: ${persona.happiness ?? 50}`}>
              <span className="text-xs grayscale-[0.2]">😊</span>
              <div className="w-10 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] transition-all duration-500 ease-out" 
                  style={{ width: `${Math.min(100, Math.max(0, persona.happiness ?? 50))}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5" title={`Anger: ${persona.anger ?? 0}`}>
              <span className="text-xs grayscale-[0.2]">💢</span>
              <div className="w-10 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] transition-all duration-500 ease-out" 
                  style={{ width: `${Math.min(100, Math.max(0, persona.anger ?? 0))}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5" title={`Anxiety: ${persona.anxiety ?? 0}`}>
              <span className="text-xs grayscale-[0.2]">😰</span>
              <div className="w-10 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] transition-all duration-500 ease-out" 
                  style={{ width: `${Math.min(100, Math.max(0, persona.anxiety ?? 0))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Buttons aligned to the far right, matching WeChat icons position */}
        <div 
          className="flex items-center gap-2 ml-4 shrink-0"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <button 
            onClick={onOpenProfile}
            className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-md transition-colors flex items-center gap-1.5"
            title={t.viewProfile || "查看档案"}
          >
            <FileUser className="w-3.5 h-3.5" />
            {t.profileShort || "档案"}
          </button>
          <button 
            onClick={onOpenConfig}
            className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-md transition-colors flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            {t.botConfig || "Bot 配置"}
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="w-full space-y-4">
          {messages
            .filter(m => m.content !== "对方正在输入中..." && m.content !== t.typing)
            .map((message, index) => (
            <div
              key={`${message.id}-${index}`}
              className={cn(
                "flex items-start gap-2 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both",
                message.sender === "user" ? "justify-end" : "justify-start"
              )}
            >
              {/* AI Avatar */}
              {message.sender === "ai" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-subtle flex items-center justify-center text-sm border border-border mt-0.5 overflow-hidden shadow-sm">
                  {persona?.avatarData ? (
                    <img src={persona.avatarData} alt={persona.name} className="w-full h-full object-cover" />
                  ) : (
                    persona?.avatar || "👤"
                  )}
                </div>
              )}
              
              <div
                className={cn(
                  "max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md",
                  message.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-card text-foreground border border-border/50 rounded-bl-none"
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>

              {/* User Avatar */}
              {message.sender === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-border mt-0.5 shadow-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {messages.some(m => m.content === "对方正在输入中..." || m.content === t.typing) && (
            <div className="flex items-start gap-2 justify-start animate-in fade-in duration-300">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-subtle flex items-center justify-center text-sm border border-border mt-0.5 overflow-hidden shadow-sm opacity-80">
                {persona?.avatarData ? (
                  <img src={persona.avatarData} alt={persona.name} className="w-full h-full object-cover" />
                ) : (
                  persona?.avatar || "👤"
                )}
              </div>
              <div className="pt-3 ml-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">{t.typing}</span>
                  <div className="flex gap-1 mt-0.5">
                    <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce [animation-duration:1s]"></div>
                    <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce [animation-duration:1s] [animation-delay:0.2s]"></div>
                    <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce [animation-duration:1s] [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card px-6 py-3">
        <div className="w-full flex items-center gap-3">
          <button
            className="p-2 text-muted-foreground/40 cursor-not-allowed transition-colors"
            title="功能正在开发中"
            disabled
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            className="p-2 text-muted-foreground/40 cursor-not-allowed transition-colors"
            title="功能正在开发中"
            disabled
          >
            <Mic className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.typeMessage}
            className="flex-1 py-2.5 px-4 text-sm bg-secondary rounded-xl border-0 outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className={cn(
              "p-2.5 rounded-xl transition-all",
              inputValue.trim()
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-secondary text-muted-foreground"
            )}
            title={t.send || "发送"}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
