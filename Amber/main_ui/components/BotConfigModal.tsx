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

'use client';

import React, { useState } from 'react';
import { X, Upload, Save, Smartphone, MessageSquare, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RelayPanel } from "./amber/RelayPanel"
import { Button } from "@/components/ui/button"
import { TRANSLATIONS } from '@/lib/i18n';

interface BotConfigModalProps {
  isOpen: boolean
  onClose: () => void
  persona: any
  language?: string
}

export function BotConfigModal({ isOpen, onClose, persona, language = 'zh' }: BotConfigModalProps) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.zh;
  const [overrideActive, setOverrideActive] = useState(persona?.is_override_active || false);
  const [overrideInterval, setOverrideInterval] = useState(persona?.override_interval || 180);
  const [botAppId, setBotAppId] = useState(persona?.bot_app_id || "");
  const [botAppSecret, setBotAppSecret] = useState(persona?.bot_app_secret || "");
  const [botToken, setBotToken] = useState(persona?.bot_token || "");

  // 同步 persona 初始值
  React.useEffect(() => {
    if (persona) {
      setOverrideActive(persona.is_override_active);
      setOverrideInterval(persona.override_interval);
      setBotAppId(persona.bot_app_id || "");
      setBotAppSecret(persona.bot_app_secret || "");
      setBotToken(persona.bot_token || "");
    }
  }, [persona]);

  if (!isOpen) return null

  const handleSave = async () => {
    try {
      const API_BASE_URL = "http://localhost:8000";
      // 准备待发送的 traits 和 catchphrases，确保是数组
      const safeTraits = typeof persona.traits === 'string' ? JSON.parse(persona.traits) : (persona.traits || []);
      const safeCatchphrases = typeof persona.catchphrases === 'string' ? JSON.parse(persona.catchphrases) : (persona.catchphrases || []);

      const res = await fetch(`${API_BASE_URL}/api/personas/${persona.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: persona.name,
          gender: persona.gender === '男' ? 'male' : persona.gender === '女' ? 'female' : 'other',
          relationship_desc: persona.relationship || persona.tag || "",
          impression: persona.impression || "",
          avatar: persona.avatarData || persona.avatar || null,
          token: persona.token || null,
          core_memory: persona.coreMemory || "",
          traits: safeTraits,
          catchphrases: safeCatchphrases,
          stability: persona.stability || 85,
          synchronization: persona.synchronization || 90,
          is_override_active: overrideActive,
          override_interval: overrideInterval,
          bot_app_id: botAppId,
          bot_app_secret: botAppSecret,
          bot_token: botToken
        })
      });
      if (res.ok) {
        // 刷新页面或更新本地状态
        window.location.reload(); // 简单粗暴但有效，确保所有状态同步
        onClose();
      } else {
        const errData = await res.json();
        alert(`${language === 'zh' ? '保存配置物理失败' : language === 'ja' ? '設定の保存に失敗しました' : 'Failed to save config'}: ${JSON.stringify(errData.detail)}`);
      }
    } catch (e) {
      console.error(e);
      alert(language === 'zh' ? '保存失败，请检查网络连接' : language === 'ja' ? '保存に失敗しました。ネットワーク接続を確認してください' : 'Save failed, please check network connection');
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[500px] bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">{t.botConfigTitle}</h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{persona?.name} {t.botConfigDesc}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <Tabs defaultValue="logic" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b border-border bg-muted/10">
            <TabsList className="h-10 bg-transparent p-0 gap-4">
              <TabsTrigger value="logic" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs font-bold uppercase tracking-widest px-0 focus-visible:ring-0 focus-visible:outline-none">
                {t.logicTuning}
              </TabsTrigger>
              <TabsTrigger value="relay" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs font-bold uppercase tracking-widest px-0 focus-visible:ring-0 focus-visible:outline-none">
                {t.externalRelay}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="logic" className="p-6 m-0 space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t.logicTuningDesc}
                  </p>
                </div>
                {/* 原有的配置项可以放在这里 */}
                <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
                  <Settings className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-[10px]">{t.logicTuningMore}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="relay" className="p-6 m-0">
              <RelayPanel 
                personaId={persona?.id} 
                initialOverrideActive={overrideActive}
                initialOverrideInterval={overrideInterval}
                initialAppId={botAppId}
                initialAppSecret={botAppSecret}
                initialToken={botToken}
                onOverrideChange={(active, interval) => {
                  setOverrideActive(active);
                  setOverrideInterval(interval);
                }}
                onConfigChange={(appId, secret, token) => {
                  setBotAppId(appId);
                  setBotAppSecret(secret);
                  setBotToken(token);
                }}
                language={language}
              />
            </TabsContent>
          </div>
        </Tabs>

        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl h-8 text-xs px-4">
            {t.cancel}
          </Button>
          <Button size="sm" onClick={handleSave} className="rounded-xl h-8 text-xs px-4 bg-primary shadow-lg shadow-primary/20">
            {t.saveConfig}
          </Button>
        </div>
      </div>
    </div>
  )
}
