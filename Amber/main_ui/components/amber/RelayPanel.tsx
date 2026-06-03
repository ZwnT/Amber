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
import { Shield, Zap, Power, PowerOff, CheckCircle2, AlertCircle, Cpu, BellRing, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { TRANSLATIONS } from '@/lib/i18n';

interface RelayPanelProps {
  personaId: string
  initialOverrideActive?: boolean
  initialOverrideInterval?: number
  initialAppId?: string
  initialAppSecret?: string
  initialToken?: string
  onStatusChange?: (connected: boolean) => void
  onOverrideChange?: (active: boolean, interval: number) => void
  onConfigChange?: (appId: string, secret: string, token: string) => void
  language?: string
}

export function RelayPanel({ 
  personaId, 
  initialOverrideActive = false, 
  initialOverrideInterval = 180, 
  initialAppId = "",
  initialAppSecret = "",
  initialToken = "",
  onStatusChange, 
  onOverrideChange,
  onConfigChange,
  language = 'zh'
}: RelayPanelProps) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.zh;
  const [botType, setBotType] = useState("QQ Bot")
  const [appId, setAppId] = useState(initialAppId)
  const [appSecret, setAppSecret] = useState(initialAppSecret)
  const [botToken, setBotToken] = useState(initialToken)
  const [isOverrideActive, setIsOverrideActive] = useState(initialOverrideActive)
  const [overrideInterval, setOverrideInterval] = useState(initialOverrideInterval)
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected")
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle")

  const API_BASE_URL = "http://localhost:8000"

  // 监听初始值变化（用于 Modal 加载数据后同步）
  useEffect(() => {
    setIsOverrideActive(initialOverrideActive)
    setOverrideInterval(initialOverrideInterval)
    setAppId(initialAppId)
    setAppSecret(initialAppSecret)
    setBotToken(initialToken)
  }, [initialOverrideActive, initialOverrideInterval, initialAppId, initialAppSecret, initialToken])

  // 当开关或间隔变化时通知父组件
  useEffect(() => {
    onOverrideChange?.(isOverrideActive, overrideInterval)
  }, [isOverrideActive, overrideInterval, onOverrideChange])

  // 当 Bot 配置变化时通知父组件
  useEffect(() => {
    onConfigChange?.(appId, appSecret, botToken)
  }, [appId, appSecret, botToken, onConfigChange])

  // 初始化获取状态
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/relay/status/${personaId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.is_connected) {
            setStatus("connected")
          } else {
            setStatus("disconnected")
          }
        }
      } catch (e) {
        console.error("无法获取中继状态", e)
      }
    }
    fetchStatus()
  }, [personaId])

  const handleTest = async () => {
    setTestStatus("testing")
    try {
      const res = await fetch(`${API_BASE_URL}/api/relay/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_type: botType, appid: appId, secret: appSecret, persona_id: personaId })
      })
      if (res.ok) {
        setTestStatus("success")
        alert(language === 'zh' ? '腾讯中继握手成功！' : language === 'ja' ? 'ハンドシェイクに成功しました！' : 'Handshake success!');
      } else {
        setTestStatus("error")
        const err = await res.json()
        alert(`${language === 'zh' ? '握手失败' : language === 'ja' ? 'ハンドシェイク失敗' : 'Handshake failed'}: ${err.detail || '未知错误'}`)
      }
    } catch (e) {
      setTestStatus("error")
      alert(language === 'zh' ? '连接后端服务器失败' : language === 'ja' ? 'サーバーへの接続に失敗しました' : 'Failed to connect to backend server')
    }
  }

  const handleConnect = async () => {
    setStatus("connecting")
    try {
      // 在正式连接前先进行物理鉴权预检
      const testRes = await fetch(`${API_BASE_URL}/api/relay/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_type: botType, appid: appId, secret: appSecret, persona_id: personaId })
      })

      if (!testRes.ok) {
        const err = await testRes.json()
        setStatus("disconnected")
        alert(`${language === 'zh' ? '鉴权未通过' : language === 'ja' ? '認証に失敗しました' : 'Authentication failed'}: ${err.detail || 'AppID 或 Secret 错误'}`)
        return
      }

      const configStr = localStorage.getItem('amber_global_api');
      let apiKey = '';
      let baseUrl = 'https://api.openai.com/v1';
      let modelId = 'gpt-4o-mini';

      if (configStr) {
        const config = JSON.parse(configStr);
        apiKey = config.apiKey;
        baseUrl = config.baseUrl;
        modelId = config.modelId;
      }

      const res = await fetch(`${API_BASE_URL}/api/relay/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          bot_type: botType, 
          appid: appId, 
          secret: appSecret, 
          persona_id: personaId,
          api_key: apiKey,
          base_url: baseUrl,
          model_id: modelId
        })
      })
      if (res.ok) {
        setStatus("connected")
        onStatusChange?.(true)
      } else {
        setStatus("disconnected")
        alert(language === 'zh' ? '热连接启动失败' : language === 'ja' ? '接続の開始に失敗しました' : 'Failed to start connection')
      }
    } catch (e) {
      setStatus("disconnected")
    }
  }

  const handleDisconnect = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/relay/disconnect?persona_id=${personaId}`, { method: "POST" })
      setStatus("disconnected")
      onStatusChange?.(false)
    } catch (e) {
      console.error("断开连接失败", e)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Shield size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">{t.relayTitle}</h3>
            <p className="text-[11px] text-muted-foreground">{t.relayDesc}</p>
          </div>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
          status === "connected" ? "bg-emerald-500/10 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]" : "bg-muted text-muted-foreground"
        )}>
          <div className={cn("w-1.5 h-1.5 rounded-full", status === "connected" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground")} />
          {status === "connected" ? t.connected : t.notReady}
        </div>
      </div>

      <div className="grid gap-5">
        <div className="space-y-2">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase">{t.relayProvider}</Label>
          <Select value={botType} onValueChange={setBotType}>
            <SelectTrigger className="h-9 bg-secondary/50 border-border text-xs rounded-xl focus:ring-primary/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border rounded-xl z-[200]">
              <SelectItem value="QQ Bot">QQ Bot (腾讯开放平台)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase">{t.appId}</Label>
            <Input 
              value={appId} 
              onChange={(e) => setAppId(e.target.value)}
              placeholder="1020..." 
              className="h-9 bg-secondary/50 border-border text-xs rounded-xl focus:ring-primary/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase">{t.appSecret}</Label>
            <Input 
              type="password"
              value={appSecret} 
              onChange={(e) => setAppSecret(e.target.value)}
              placeholder="••••••••" 
              className="h-9 bg-secondary/50 border-border text-xs rounded-xl focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase">{t.botToken}</Label>
          <Input 
            type="password"
            value={botToken} 
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="v2.0.xyz..." 
            className="h-9 bg-secondary/50 border-border text-xs rounded-xl focus:ring-primary/20"
          />
        </div>

        <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-primary" />
              <Label className="text-xs font-bold">{t.activeRelay}</Label>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px] rounded-lg px-3"
                onClick={handleTest}
                disabled={testStatus === "testing"}
              >
                {testStatus === "testing" ? "..." : t.testHandshake}
              </Button>
              {status !== "connected" ? (
                <Button 
                  size="sm" 
                  className="h-7 text-[10px] rounded-lg px-3 bg-primary"
                  onClick={handleConnect}
                  disabled={status === "connecting"}
                >
                  <Power size={12} className="mr-1" />
                  {status === "connecting" ? "..." : t.startHotConnect}
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  variant="destructive"
                  className="h-7 text-[10px] rounded-lg px-3"
                  onClick={handleDisconnect}
                >
                  <PowerOff size={12} className="mr-1" />
                  {t.stopHotConnect}
                </Button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed italic">
            * {t.activeRelayDesc}
          </p>
        </div>

        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing size={14} className="text-primary" />
              <div>
                <Label className="text-xs font-bold">{t.autonomousWakeup}</Label>
                <p className="text-[10px] text-muted-foreground">{t.autonomousWakeupDesc}</p>
              </div>
            </div>
            <Switch 
              checked={isOverrideActive} 
              onCheckedChange={setIsOverrideActive}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          
          {isOverrideActive && (
            <div className="flex items-center gap-4 pt-2 animate-in slide-in-from-top-2 duration-300">
              <div className="flex-1 flex items-center gap-2">
                <Clock size={12} className="text-muted-foreground" />
                <Label className="text-[10px] text-muted-foreground uppercase">{t.wakeupInterval}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Select 
                  value={overrideInterval.toString()}
                  onValueChange={(v) => setOverrideInterval(parseInt(v))}
                >
                  <SelectTrigger className="w-24 h-7 text-[10px] bg-background border-border rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-[200]">
                    <SelectItem value="1">1 {t.minSuffix}</SelectItem>
                    <SelectItem value="2">2 {t.minSuffix}</SelectItem>
                    <SelectItem value="3">3 {t.minSuffix}</SelectItem>
                    <SelectItem value="4">4 {t.minSuffix}</SelectItem>
                    <SelectItem value="5" disabled>5 {t.minSuffix} ({language === 'zh' ? '测试中' : 'Testing'})</SelectItem>
                    <SelectItem value="30" disabled>30 {t.minSuffix} ({language === 'zh' ? '测试中' : 'Testing'})</SelectItem>
                    <SelectItem value="60" disabled>60 {t.minSuffix} ({language === 'zh' ? '测试中' : 'Testing'})</SelectItem>
                    <SelectItem value="180" disabled>180 {t.minSuffix} ({language === 'zh' ? '测试中' : 'Testing'})</SelectItem>
                    <SelectItem value="360" disabled>360 {t.minSuffix} ({language === 'zh' ? '测试中' : 'Testing'})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
        <div className="flex gap-2 items-start text-[10px] text-muted-foreground leading-relaxed">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <p>开启中继后，外部消息将直接穿透至认知核心并自动触发 RAG 记忆回捞。所有对话将同步至本地 Message 数据库。</p>
        </div>
      </div>
    </div>
  )
}
