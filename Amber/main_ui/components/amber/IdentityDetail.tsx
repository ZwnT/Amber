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
import { ArrowLeft, Trash2, ShieldAlert, Quote, Heart, User, Info, Zap, Activity, HelpCircle, Settings, Save, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Persona } from './persona-roster';
import { MemoryViewer } from './MemoryViewer';
import { TRANSLATIONS } from '@/lib/i18n';

const API_BASE_URL = 'http://localhost:8000';

interface IdentityDetailProps {
  persona: Persona;
  onBack: () => void;
  onDelete: (id: string) => void;
  onUpdate?: (persona: Persona) => void;
  language?: string;
}

export function IdentityDetail({ persona, onBack, onDelete, onUpdate, language = 'zh' }: IdentityDetailProps) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.zh;
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  // Profile Editing States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(persona.name);
  const [editAvatar, setEditAvatar] = useState(persona.avatar || "👤");
  const [editCoreMemory, setEditCoreMemory] = useState(persona.coreMemory || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [showClearSuccess, setShowClearSuccess] = useState(false);

  const handleClearHistory = async () => {
    if (!window.confirm(t.clearHistoryConfirm.replace('{name}', persona.name))) return;
    
    setIsClearingHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/persona/clear-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona_id: persona.id })
      });
      
      if (res.ok) {
        setShowClearSuccess(true);
        setTimeout(() => {
          setShowClearSuccess(false);
          // 核心重构：清空成功后物理重载页面，强制所有组件（Chat, MemoryViewer）重新从数据库拉取空数据
          window.location.reload();
        }, 1500);
      }
    } catch (e) {
      console.error("Clear history failed", e);
    } finally {
      setIsClearingHistory(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/persona/commit-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona_id: persona.id,
          name: editName,
          avatar: editAvatar,
          core_memory: editCoreMemory
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setIsEditing(false);
        if (onUpdate) {
          onUpdate({
            ...persona,
            name: data.persona.name,
            avatar: data.persona.avatar,
            coreMemory: data.persona.core_memory,
            traits: data.persona.traits,
            stability: data.persona.stability,
            synchronization: data.persona.synchronization
          });
        }
      }
    } catch (e) {
      console.error("Save profile failed", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background animate-in slide-in-from-right-4 duration-500">
      {/* Header */}
      <header className="h-14 px-5 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-secondary rounded-lg text-muted-foreground transition-colors group shrink-0"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <h1 className="text-base font-medium text-foreground tracking-tight truncate">{t.profileView}</h1>
        </div>
        
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-muted-foreground hover:text-foreground rounded-lg text-xs font-medium transition-colors shrink-0"
          >
            <Settings size={14} />
            {t.modifyPersona}
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 bg-secondary text-muted-foreground hover:text-foreground rounded-lg text-xs font-medium transition-colors"
            >
              {t.cancel}
            </button>
            <button 
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-1.5 bg-amber-500 text-white hover:bg-amber-600 rounded-lg text-xs font-bold shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <span className="animate-spin text-lg leading-none mb-1">⚙️</span>
              ) : (
                <Save size={14} />
              )}
              {t.save}
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8 space-y-10">
          {/* Top Profile Card - Amber Aesthetic */}
          <div className="relative flex flex-col items-center py-10">
            {/* Avatar with Breathing Light Border */}
            <div className="relative group">
              {/* Outer Breathing Ring */}
              <div className="absolute -inset-1.5 bg-primary/30 rounded-full blur-sm animate-pulse group-hover:bg-primary/50 transition-colors" />
              <div className="absolute -inset-1 border-2 border-primary/50 rounded-full animate-ping opacity-20" />
              
              <div className="relative w-32 h-32 rounded-full bg-amber-subtle flex items-center justify-center text-5xl border-4 border-background shadow-2xl overflow-hidden z-10">
                {!isEditing ? (
                  (persona.avatarData || (persona.avatar && persona.avatar.startsWith('data:image'))) ? (
                    <img src={persona.avatarData || persona.avatar} alt={persona.name} className="w-full h-full object-cover" />
                  ) : (
                    persona.avatar
                  )
                ) : (
                  (editAvatar && editAvatar.startsWith('data:image')) ? (
                    <img src={editAvatar} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    editAvatar
                  )
                )}
              </div>
            </div>
            
            <div className="mt-8 space-y-3 text-center w-full max-w-sm">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex flex-col items-center gap-2">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">{t.uploadAvatar}</label>
                    <label className="cursor-pointer bg-secondary/50 hover:bg-secondary border border-border rounded-xl px-4 py-2 text-sm text-foreground transition-colors">
                      {t.selectImage}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">{t.personaName}</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-3xl font-light tracking-tight text-center bg-secondary/50 border border-border rounded-xl px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              ) : (
                <h2 className="text-3xl font-light tracking-tight text-foreground">{persona.name}</h2>
              )}
              <div className="flex items-center justify-center gap-3">
                <span className="px-3 py-1 bg-secondary text-muted-foreground text-[10px] font-bold uppercase tracking-widest rounded-full border border-border">
                  {persona.gender || t.unknown}
                </span>
                <span className="px-4 py-1 bg-primary/10 text-primary text-xs font-serif italic rounded-full border border-primary/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                  {persona.tag || persona.relationship || t.undefinedRel}
                </span>
              </div>
            </div>
          </div>

          {/* Technical Indicators - Progress Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card/50 border border-border rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Zap size={14} className="text-primary" />
                  {t.personaStability}
                </div>
                <span className="text-xs font-mono text-primary">{persona.stability || 85}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary shadow-[0_0_8px_rgba(245,158,11,0.4)] transition-all duration-1000 ease-out" 
                  style={{ width: `${persona.stability || 85}%` }} 
                />
              </div>
            </div>
            <div className="bg-card/50 border border-border rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Activity size={14} className="text-primary" />
                  {t.memorySync}
                </div>
                <span className="text-xs font-mono text-primary">{persona.synchronization || 92}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary shadow-[0_0_8px_rgba(245,158,11,0.4)] transition-all duration-1000 ease-out" 
                  style={{ width: `${persona.synchronization || 92}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Core Memory Section */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center gap-2">
              <Quote size={16} className="text-primary" />
              <div className="flex items-center">
                <h3 className="text-sm font-semibold text-foreground">{t.coreMemoryTitle}</h3>
                <div className="relative group ml-1">
                  <HelpCircle className="w-4 h-4 text-gray-500 cursor-help hover:text-amber-400 transition-colors inline-block" />
                  <div className="absolute top-full left-0 mt-2 hidden group-hover:block w-64 p-3 bg-gray-900/90 backdrop-blur-md border border-amber-500/30 text-xs text-gray-300 rounded-lg shadow-lg shadow-amber-500/10 z-50 animate-fade-in">
                    {t.coreMemoryHelp}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              {isEditing ? (
                <textarea 
                  value={editCoreMemory}
                  onChange={(e) => setEditCoreMemory(e.target.value)}
                  className="w-full h-32 bg-secondary/30 border border-border rounded-xl p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder={t.coreMemoryPlaceholder}
                />
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed italic">
                  {persona.coreMemory ? `“${persona.coreMemory}”` : `“${t.vagueMemory}”`}
                </p>
              )}
            </div>
          </div>

          {/* Personality Traits - Additional Content */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Info size={16} className="text-primary" />
                  {t.traitsTitle}
                </h3>
                <div className="relative group ml-1">
                  <HelpCircle className="w-4 h-4 text-gray-500 cursor-help hover:text-amber-400 transition-colors inline-block" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-gray-900/90 backdrop-blur-md border border-amber-500/30 text-xs text-gray-300 rounded-lg shadow-lg shadow-amber-500/10 z-50 animate-fade-in">
                    {t.traitsHelp}
                  </div>
                </div>
              </div>
              
              {isEditing ? (
                <div className="space-y-4">
                  <p className="text-xs text-amber-500 font-medium italic">
                    {t.traitsLocked}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {persona.impression || "该数字生命仍在自我完善中，主观特质尚未完全成型。"}
                  </p>
                  
                  {/* 核心性格特质：唯一渲染源 */}
                  <p className="text-xs text-muted-foreground leading-relaxed font-mono pt-2">
                    {persona.traits?.[0] || ""}
                  </p>
                </>
              )}
            </div>

            {persona.catchphrases && persona.catchphrases.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Quote size={14} className="text-muted-foreground" />
                    高频口头禅
                  </h3>
                  <div className="relative group ml-1">
                    <HelpCircle className="w-4 h-4 text-gray-500 cursor-help hover:text-amber-400 transition-colors inline-block" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-gray-900/90 backdrop-blur-md border border-amber-500/30 text-xs text-gray-300 rounded-lg shadow-lg shadow-amber-500/10 z-50 animate-fade-in">
                      高频特征词捕获引擎。严格锚定原始文本中的语气词或特定黑梗，拒绝通用鸡汤，复刻真人打字习惯。
                    </div>
                  </div>
                </div>
                <ul className="space-y-2">
                  {persona.catchphrases.map((phrase, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground bg-muted/30 px-4 py-2 rounded-lg border border-border">
                      {phrase}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* System 2 Memory Viewer Section */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
            <MemoryViewer personaId={persona.id} />
          </div>

          {/* Erase Action */}
          <div className="pt-10 space-y-4">
            {!showConfirmDelete ? (
              <>
                <button 
                  onClick={handleClearHistory}
                  disabled={isClearingHistory}
                  className={cn(
                    "w-full py-4 bg-amber-500/5 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-500/20 rounded-2xl text-sm font-medium transition-all flex items-center justify-center gap-2 group",
                    showClearSuccess && "bg-green-500 text-white border-green-500"
                  )}
                >
                  {isClearingHistory ? (
                    <span className="animate-spin text-sm">⚙️</span>
                  ) : showClearSuccess ? (
                    <Check size={16} />
                  ) : (
                    <Activity size={16} className="group-hover:animate-pulse" />
                  )}
                  {showClearSuccess ? "清空成功" : "物理清空记忆 (Clear History)"}
                </button>

                <button 
                  onClick={() => setShowConfirmDelete(true)}
                  className="w-full py-4 bg-destructive/5 text-destructive hover:bg-destructive hover:text-white border border-destructive/20 rounded-2xl text-sm font-medium transition-all flex items-center justify-center gap-2 group"
                >
                  <Trash2 size={16} className="group-hover:rotate-12 transition-transform" />
                  彻底抹除 (Erase)
                </button>
              </>
            ) : (
              <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-8 space-y-6 animate-in fade-in zoom-in duration-300 shadow-xl shadow-destructive/5">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2">
                    <ShieldAlert size={24} />
                  </div>
                  <h4 className="text-lg font-semibold text-foreground">执行抹除操作？</h4>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    该操作将从 Amber 系统中永久物理粉碎 {persona.name} 的所有意识片段与记忆权重。此过程不可逆。
                  </p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowConfirmDelete(false)}
                    className="flex-1 py-3 bg-secondary text-foreground rounded-xl text-xs font-medium hover:bg-secondary/80 transition-all active:scale-95"
                  >
                    保留档案
                  </button>
                  <button 
                    onClick={() => onDelete(persona.id)}
                    className="flex-1 py-3 bg-destructive text-white rounded-xl text-xs font-bold hover:bg-destructive/90 transition-all active:scale-95 shadow-lg shadow-destructive/20"
                  >
                    确认粉碎
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 物理删除灰度预览弹窗 */}
    </div>
  );
}
