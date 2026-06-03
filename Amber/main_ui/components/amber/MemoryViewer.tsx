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

"use client";

import React, { useState, useEffect } from 'react';
import { BatteryCharging, Trash2, Pin, Database, HelpCircle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config'; // wait, in previous steps I had to remove this from DataMonitor.tsx and declare locally.

const LOCAL_API_BASE_URL = 'http://localhost:8000';

interface MemoryCorpus {
  id: number;
  content: string;
  weight: number;
  is_pinned: boolean;
  timestamp: string;
}

interface MemoryViewerProps {
  personaId: string | null;
}

export function MemoryViewer({ personaId }: MemoryViewerProps) {
  const [memories, setMemories] = useState<MemoryCorpus[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMemories = async () => {
    if (!personaId) return;
    try {
      const res = await fetch(`${LOCAL_API_BASE_URL}/api/system/memory/${personaId}`);
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (e) {
      console.error("Failed to fetch memories", e);
    }
  };

  // Poll every 5 seconds to sync with Janitor
  useEffect(() => {
    if (!personaId) {
      setMemories([]);
      return;
    }
    setIsLoading(true);
    fetchMemories().finally(() => setIsLoading(false));

    const interval = setInterval(fetchMemories, 5000);
    return () => clearInterval(interval);
  }, [personaId]);

  const handleCharge = async (corpusId: number) => {
    try {
      const res = await fetch(`${LOCAL_API_BASE_URL}/api/system/memory/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corpus_id: corpusId })
      });
      if (res.ok) {
        // Optimistic update and trigger re-fetch for absolute truth
        setMemories(prev => prev.map(m => m.id === corpusId ? { ...m, weight: 1.0 } : m));
        fetchMemories();
      }
    } catch (e) {
      console.error("Failed to charge memory", e);
    }
  };

  const handleErase = async (corpusId: number) => {
    try {
      const res = await fetch(`${LOCAL_API_BASE_URL}/api/system/memory/erase/${corpusId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // Optimistic update with fade-out effect handling implicitly by removing
        setMemories(prev => prev.filter(m => m.id !== corpusId));
        fetchMemories();
      }
    } catch (e) {
      console.error("Failed to erase memory", e);
    }
  };

  const handleTogglePin = async (corpusId: number) => {
    try {
      const res = await fetch(`${LOCAL_API_BASE_URL}/api/system/memory/toggle-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corpus_id: corpusId })
      });
      if (res.ok) {
        const data = await res.json();
        setMemories(prev => prev.map(m => m.id === corpusId ? { ...m, is_pinned: data.is_pinned, weight: data.weight } : m));
        fetchMemories();
      }
    } catch (e) {
      console.error("Failed to toggle pin", e);
    }
  };

  if (!personaId) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
        请先选择一个数字生命以查看其脑皮层代谢状态。
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-4">
      <div className="flex items-center space-x-2 border-b border-gray-100 pb-2">
        <Database className="w-4 h-4 text-amber-500" />
        <div className="flex items-center">
          <h3 className="text-sm font-semibold text-gray-800">
            System 2 脑皮层记忆链 (Memory Viewer)
          </h3>
          <div className="relative group ml-1">
            <HelpCircle className="w-4 h-4 text-gray-500 cursor-help hover:text-amber-400 transition-colors inline-block" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-72 p-4 bg-gray-900/90 backdrop-blur-md border border-amber-500/30 text-xs text-gray-300 rounded-lg shadow-lg shadow-amber-500/10 z-50 animate-fade-in">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
                <span className="text-lg">🧠</span>
                <span className="font-semibold text-amber-500">【System 2 脑皮层神经元监控箱】</span>
              </div>
              <div className="space-y-2 mt-2">
                <p>此处为当前分身独属的冷记忆库切片。</p>
                <p><span className="text-blue-400 font-medium">📌 固化钢印：</span>无视时间半衰期，永久锁定为底层最高认知逻辑，优先于出厂设定。</p>
                <p><span className="text-amber-400 font-medium">🔋 寿命代谢：</span>未打钢印的废话记忆将随 Janitor 常驻进程每 60 秒发生外周磨损。当饱满度（Weight）跌破 0.3 时，将被系统无情物理抹除。宿主可随时进行手动充电或格式化干预。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar" style={{ maxHeight: '400px' }}>
        {isLoading && memories.length === 0 ? (
          <div className="text-xs text-gray-400 animate-pulse">扫描认知神经元中...</div>
        ) : memories.length === 0 ? (
          <div className="text-xs text-gray-400">当前冷记忆库为空。</div>
        ) : (
          memories.map((m) => {
            const isCritical = m.weight < 0.4 && !m.is_pinned;
            const isWarning = m.weight >= 0.4 && m.weight < 0.7 && !m.is_pinned;
            const barColor = m.is_pinned ? 'bg-blue-400' : isCritical ? 'bg-red-500 animate-pulse' : isWarning ? 'bg-yellow-400' : 'bg-green-500';
            const widthPct = Math.max(0, Math.min(100, m.weight * 100));

            return (
              <div key={m.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all group animate-fade-in">
                {/* Left: Text */}
                <div className="flex items-start space-x-2 flex-1 min-w-0 pr-4">
                  <button 
                    onClick={() => handleTogglePin(m.id)}
                    className="flex-shrink-0 mt-0.5 p-0.5 hover:bg-gray-100 rounded transition-colors focus:outline-none"
                    title={m.is_pinned ? "取消固化" : "打上钢印"}
                  >
                    <Pin className={`w-4 h-4 transition-colors ${m.is_pinned ? 'text-blue-500 drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]' : 'text-gray-300'}`} />
                  </button>
                  <p className="text-xs text-gray-600 truncate" title={m.content}>
                    {m.content}
                  </p>
                </div>

                {/* Middle: Health Bar */}
                <div className="flex items-center space-x-2 flex-shrink-0 mr-4">
                  <span className="text-[10px] text-gray-400 w-8 text-right">{Math.round(m.weight * 100)}%</span>
                  <div className="w-24 bg-gray-800 h-2 rounded-full overflow-hidden border border-gray-700 shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`} 
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleCharge(m.id)}
                    className="p-1.5 hover:bg-green-50 rounded-md text-gray-400 hover:text-green-600 transition-colors"
                    title="强制重置记忆饱满度至 100%"
                  >
                    <BatteryCharging className="w-3.5 h-3.5" />
                  </button>
                  {!m.is_pinned && (
                    <button 
                      onClick={() => handleErase(m.id)}
                      className="p-1.5 hover:bg-red-50 rounded-md text-gray-400 hover:text-red-600 transition-colors"
                      title="物理擦除该记忆碎片"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
