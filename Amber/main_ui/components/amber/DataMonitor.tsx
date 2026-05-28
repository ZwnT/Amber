'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Activity, Terminal, Database, Trash2, Cpu, HelpCircle } from 'lucide-react';
import { TRANSLATIONS } from '@/lib/i18n';

const API_BASE_URL = 'http://localhost:8000';

interface SystemStatus {
  latency: number;
  corpus_count: number;
  janitor_speed: number;
  stability: number;
  logs?: string[];
}

export function DataMonitor({ activePersonaId, language = 'zh' }: { activePersonaId?: string | null, language?: string }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.zh;
  
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    setLogs([
      `[SYSTEM] ${language === 'zh' ? 'Janitor 进程初始化...' : language === 'ja' ? 'Janitorプロセスが初期化されました...' : 'Janitor process initialized...'}`,
      `[INFO] ${language === 'zh' ? '正在连接到后端遥测流...' : language === 'ja' ? 'バックエンドテレメトリストリームに接続中...' : 'Connecting to backend telemetry stream...'}`,
    ]);
  }, [language]);
  
  const [status, setStatus] = useState<SystemStatus>({
    latency: 0,
    corpus_count: 0,
    janitor_speed: 0,
    stability: 98.5
  });
  
  const [stabilityHistory, setStabilityHistory] = useState<number[]>([98.5, 98.5, 98.5, 98.5, 98.5, 98.5, 98.5, 98.5, 98.5, 98.5]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Poll backend status every 5 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/system/status`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
          
          setStabilityHistory(prev => {
            const newHistory = [...prev.slice(1), data.stability];
            return newHistory;
          });
          
          if (data.logs && data.logs.length > 0) {
            setLogs(data.logs);
          } else if (data.janitor_speed > 0) {
            const logMsg = t.janitorSpeedLog.replace('{count}', data.janitor_speed.toString());
            setLogs(prev => [...prev.slice(-40), `[JANITOR] ${new Date().toLocaleTimeString()} - ${logMsg}`]);
          }
        }
      } catch (e) {
        console.error("Failed to fetch system status", e);
      }
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [t.janitorSpeedLog]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex-1 bg-background overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center">
              <h2 className="text-2xl font-light tracking-tight text-foreground flex items-center gap-3">
                <Activity className="text-primary" size={24} />
                {t.monitorTitle}
              </h2>
              <div className="relative group ml-2 mt-1 z-50">
                <HelpCircle className="w-5 h-5 text-gray-500 cursor-help hover:text-amber-400 transition-colors inline-block" />
                <div className="absolute top-full left-0 mt-2 hidden group-hover:block w-64 p-3 bg-gray-900/90 backdrop-blur-md border border-amber-500/30 text-xs text-gray-300 rounded-lg shadow-lg shadow-amber-500/10 z-50 animate-fade-in">
                  {t.monitorHelp}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {t.monitorDesc}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-card border border-border px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm relative group cursor-help">
              <Cpu size={16} className="text-emerald-500" />
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase">{t.latencyLabel}</span>
                <span className="text-sm font-semibold font-mono text-emerald-500">{status.latency} {language === 'zh' ? '毫秒' : language === 'ja' ? 'ミリ秒' : 'ms'}</span>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block w-48 p-3 bg-gray-900/90 backdrop-blur-md border border-emerald-500/30 text-xs text-gray-300 rounded-lg shadow-lg shadow-emerald-500/10 z-50 animate-fade-in text-center">
                {t.latencyDesc}
              </div>
            </div>
            <div className="bg-card border border-border px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm relative group cursor-help">
              <Database size={16} className="text-primary" />
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase">{t.corpusLabel}</span>
                <span className="text-sm font-semibold font-mono text-primary">{status.corpus_count} {language === 'zh' ? '条' : language === 'ja' ? '項目' : 'items'}</span>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block w-48 p-3 bg-gray-900/90 backdrop-blur-md border border-amber-500/30 text-xs text-gray-300 rounded-lg shadow-lg shadow-amber-500/10 z-50 animate-fade-in text-center">
                {t.corpusDesc}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Janitor Logs Section */}
          <div className="space-y-3 relative z-20">
            <div className="flex items-center">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Terminal size={14} className="text-muted-foreground" />
                {t.janitorLogTitle}
              </h3>
              <div className="relative group ml-1">
                <HelpCircle className="w-4 h-4 text-gray-500 cursor-help hover:text-amber-400 transition-colors inline-block" />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block w-64 p-3 bg-gray-900/90 backdrop-blur-md border border-amber-500/30 text-xs text-gray-300 rounded-lg shadow-lg shadow-amber-500/10 z-50 animate-fade-in">
                  {t.janitorLogHelp}
                </div>
              </div>
            </div>
            <div className="bg-[#0c0c0c] border border-border/50 rounded-2xl p-4 h-80 font-mono text-xs overflow-y-auto shadow-inner">
              <div className="space-y-1.5">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-emerald-500/50 select-none">$</span>
                    <span className={log.includes('CLEANUP') || log.includes('抹除') || log.includes('erased') || log.includes('消去') ? 'text-amber-400' : 'text-zinc-300'}>
                      {log}
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>

          {/* Memory Weights Chart Section */}
          <div className="space-y-3 relative z-20">
            <div className="flex items-center">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Activity size={14} className="text-muted-foreground" />
                {t.stabilityTitle}
              </h3>
              <div className="relative group ml-1">
                <HelpCircle className="w-4 h-4 text-gray-500 cursor-help hover:text-amber-400 transition-colors inline-block" />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block w-64 p-3 bg-gray-900/90 backdrop-blur-md border border-amber-500/30 text-xs text-gray-300 rounded-lg shadow-lg shadow-amber-500/10 z-50 animate-fade-in">
                  {t.stabilityHelp}
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 h-80 flex flex-col justify-between shadow-sm relative overflow-hidden group">
              <div className="flex items-end justify-between h-48 gap-2">
                {stabilityHistory.map((val, i) => {
                  const height = ((val - 90) / 10) * 100; // Normalize 90-100 to 0-100%
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-emerald-500/20 hover:bg-emerald-500/40 border-t-2 border-emerald-500 rounded-t-sm transition-all duration-500 ease-out"
                        style={{ height: `${Math.max(5, height)}%` }}
                      />
                      <span className="text-[10px] text-muted-foreground font-mono">T-{9-i}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                <span>{t.stabilityMetric}</span>
                <span className="text-emerald-500 font-bold">{t.currentHealth}: {status.stability.toFixed(1)}%</span>
              </div>
              
              {/* Decorative pulse effect */}
              <div className="absolute top-0 right-0 p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  <span className="text-[10px] font-mono text-primary uppercase">{t.scanning}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
