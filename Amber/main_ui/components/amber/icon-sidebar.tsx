"use client"

import { Plus, MessageCircle, Globe, Activity, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

interface IconSidebarProps {
  activeItem: string
  onItemClick: (item: string) => void
  userAvatar?: string
  onUserClick?: () => void
  t: any
}

export function IconSidebar({ activeItem, onItemClick, t }: IconSidebarProps) {
  const sidebarItems = [
    { id: "add", icon: Plus, label: t.add, position: "top" },
    { id: "chat", icon: MessageCircle, label: t.chat, position: "top" },
    { id: "monitor", icon: Activity, label: t.monitor, position: "top" },
    { id: "settings", icon: Settings, label: t.settings, position: "bottom" },
  ]

  const topItems = sidebarItems.filter((item) => item.position === "top")
  const bottomItems = sidebarItems.filter((item) => item.position === "bottom")

  return (
    <aside className="w-16 h-full bg-sidebar border-r border-sidebar-border flex flex-col items-center py-3 z-[110]">
      {/* Logo Position - Now at Top */}
      <div className="mb-6 w-10 h-10 flex items-center justify-center p-1.5">
        <img src="./logo.png" alt="Amber Logo" className="w-full h-full object-contain" />
      </div>

      <div className="flex flex-col items-center gap-2">
        {topItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item.id)}
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200",
              "hover:bg-sidebar-accent",
              activeItem === item.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground"
            )}
            title={item.label}
          >
            <item.icon className="w-5 h-5" />
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <div className="flex flex-col items-center gap-2">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item.id)}
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200",
              "hover:bg-sidebar-accent",
              activeItem === item.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground"
            )}
            title={item.label}
          >
            <item.icon className="w-5 h-5" />
          </button>
        ))}
      </div>
    </aside>
  )
}
