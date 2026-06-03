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

import { useState, useEffect } from "react"
import { Sparkles, Globe, Activity, Settings, Shield, Settings2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface PlaceholderViewProps {
  type: "add" | "api" | "monitor" | "settings"
  onReset?: () => void
}

const viewConfig = {
  add: {
    icon: Sparkles,
    title: "Distillation Wizard: Create New Persona",
    subtitle: "创建新的数字人格",
    description: "通过提炼向导，从对话记录、文档或记忆中创建独特的 AI 人格。",
  },
  api: {
    icon: Globe,
    title: "Global API Settings",
    subtitle: "全局 API 配置",
    description: "配置和管理您的 API 密钥、模型选择和全局参数设置。",
  },
  monitor: {
    icon: Activity,
    title: "Data Monitor",
    subtitle: "数据监控面板",
    description: "实时监控系统状态、API 调用次数和资源使用情况。",
  },
  settings: {
    icon: Settings,
    title: "Settings",
    subtitle: "系统设置",
    description: "个性化您的琥珀体验，包括主题、通知和隐私设置。",
  },
}

export function PlaceholderView({ type, onReset }: PlaceholderViewProps) {
  const [janitorTestMode, setJanitorTestMode] = useState(false)
  const API_BASE_URL = "http://localhost:8000"

  useEffect(() => {
    if (type === 'settings') {
      fetchSystemStatus()
    }
  }, [type])

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/system/status`)
      if (res.ok) {
        const data = await res.json()
        setJanitorTestMode(data.janitor_test_mode)
      }
    } catch (e) {
      console.error("Failed to fetch system status", e)
    }
  }

  const handleToggleTestMode = async (enabled: boolean) => {
    setJanitorTestMode(enabled)
    try {
      await fetch(`${API_BASE_URL}/api/system/janitor-test-mode?enabled=${enabled}`, {
        method: "POST"
      })
    } catch (e) {
      console.error("Failed to toggle test mode", e)
    }
  }

  const handleSaveSettings = () => {
    // 这里可以触发 API 保存或简单的 UI 反馈
    alert("系统配置已持久化至云端。")
  }

  const config = viewConfig[type]
  const Icon = config.icon

  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-6">
        <div className="w-20 h-20 rounded-2xl bg-muted/30 mx-auto mb-6 flex items-center justify-center p-4 border border-border shadow-sm">
          <img src="./logo.png" alt="Amber Logo" className="w-full h-full object-contain" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {config.title}
        </h2>
        <p className="text-base text-muted-foreground mb-4">
          {config.subtitle}
        </p>
        <p className="text-sm text-muted-foreground/70 leading-relaxed">
          {config.description}
        </p>

        {type === 'settings' ? (
          <div className="mt-12 space-y-6 text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 bg-muted/30 rounded-2xl border border-border space-y-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold">系统开发与调试</h3>
              </div>
              
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">意识觉醒测试模式</Label>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    绕过概率判定，强制触发 Janitor 觉醒逻辑 (100% 必中)。
                  </p>
                </div>
                <Switch 
                  checked={janitorTestMode} 
                  onCheckedChange={handleToggleTestMode}
                />
              </div>

              <div className="pt-2">
                <p className="text-[10px] text-amber-600/80 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10 italic">
                  * 开启后，分身将在满足时间阈值后必定发起主动查岗。
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 pt-4">
              <button
                onClick={handleSaveSettings}
                className="w-full py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-bold hover:bg-primary/90 transition-all active:scale-95 shadow-md"
              >
                保存全局配置 (Save Settings)
              </button>
              
              <button
                onClick={onReset}
                className="w-full py-3 bg-destructive/5 text-destructive border border-destructive/20 rounded-2xl text-xs font-bold hover:bg-destructive hover:text-white transition-all active:scale-95 shadow-sm mt-4"
              >
                重置系统 (Reset)
              </button>
              <p className="text-[10px] text-muted-foreground">危险操作：将清除本地 API 配置缓存</p>
            </div>
          </div>
        ) : type === 'monitor' ? (
           <div className="mt-8">
             <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg text-sm text-muted-foreground">
               <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
               监控功能开发中...
             </div>
           </div>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              功能开发中...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
