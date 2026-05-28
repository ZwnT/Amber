'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, Globe, Moon, History, Info, Save, Trash2, 
  AlertTriangle, Camera, Key, Link, Cpu, Building, Wifi, 
  CheckCircle2, AlertCircle, Settings2, Shield 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

import { TRANSLATIONS } from '@/lib/i18n';

const PROVIDERS = [
  { name: 'OpenAI', url: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini' },
  { name: 'Anthropic', url: 'https://api.anthropic.com/v1', defaultModel: 'claude-3-haiku-20240307' },
  { name: 'DeepSeek', url: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-v4-flash' },
  { name: 'Ollama (Local)', url: 'http://localhost:11434/v1', defaultModel: 'llama3' },
  { name: '自定义 (Custom)', url: '', defaultModel: '' }
];

interface SettingsCenterProps {
  userAvatar: string;
  onSaveAvatar: (avatar: string) => void;
  onReset: () => void;
  language: string;
  setLanguage: (lang: string) => void;
}

export function SettingsCenter({ userAvatar, onSaveAvatar, onReset, language, setLanguage }: SettingsCenterProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const t = TRANSLATIONS[language] || TRANSLATIONS.zh;
  
  // Profile State
  const [tempAvatar, setTempAvatar] = useState(userAvatar);
  
  // API Config State
  const [provider, setProvider] = useState('OpenAI');
  const [modelId, setModelId] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');

  // Engine State
  const [incubationInterval, setIncubationInterval] = useState(5);
  const [janitorTestMode, setJanitorTestMode] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const API_BASE_URL = "http://localhost:8000";

  useEffect(() => {
    // Load Avatar
    setTempAvatar(userAvatar);
    
    // Load API Config
    const savedAPI = localStorage.getItem('amber_global_api');
    if (savedAPI) {
      try {
        const parsed = JSON.parse(savedAPI);
        if (parsed.provider) setProvider(parsed.provider);
        if (parsed.modelId) setModelId(parsed.modelId);
        if (parsed.apiKey) setApiKey(parsed.apiKey);
        if (parsed.baseUrl) setBaseUrl(parsed.baseUrl);
      } catch (e) {}
    }

    // Load Engine Config
    const savedInterval = localStorage.getItem('amber_incubation_interval');
    if (savedInterval) setIncubationInterval(parseInt(savedInterval));

    // Load Language Config
    const savedLang = localStorage.getItem('amber_language');
    if (savedLang) setLanguage(savedLang);

    fetchSystemStatus();
  }, [userAvatar]);

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/system/status`);
      if (res.ok) {
        const data = await res.json();
        setJanitorTestMode(data.janitor_test_mode);
      }
    } catch (e) {
      console.error("Failed to fetch system status", e);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setTempAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value;
    setProvider(newProvider);
    const preset = PROVIDERS.find(p => p.name === newProvider);
    if (preset && newProvider !== '自定义 (Custom)') {
      setBaseUrl(preset.url);
      setModelId(preset.defaultModel);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey && provider !== 'Ollama (Local)') {
      setTestStatus('error');
      setTestMsg('请先填写 API Key');
      return;
    }
    setTestStatus('testing');
    setTestMsg('正在发送测试请求...');

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelId || 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 5
        })
      });

      if (response.ok) {
        setTestStatus('success');
        setTestMsg('连接成功！');
      } else {
        const err = await response.json().catch(() => ({}));
        setTestStatus('error');
        setTestMsg(`连接失败: ${response.status} ${err.error?.message || response.statusText}`);
      }
    } catch (error: any) {
      setTestStatus('error');
      setTestMsg(`连接异常: ${error.message}`);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    
    // Save to LocalStorage
    localStorage.setItem('amber_user_avatar', tempAvatar);
    localStorage.setItem('amber_global_api', JSON.stringify({ provider, modelId, apiKey, baseUrl }));
    localStorage.setItem('amber_incubation_interval', incubationInterval.toString());
    localStorage.setItem('amber_language', language);
    
    onSaveAvatar(tempAvatar);

    // Sync to Backend
    try {
      await fetch(`${API_BASE_URL}/api/system/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          incubation_interval_min: incubationInterval,
          api_key: apiKey,
          base_url: baseUrl,
          model_id: modelId
        })
      });
      
      await fetch(`${API_BASE_URL}/api/system/janitor-test-mode?enabled=${janitorTestMode}`, {
        method: "POST"
      });
    } catch (e) {
      console.error("Failed to sync config to backend", e);
    }

    setTimeout(() => {
      setIsSaving(false);
      alert("全局配置已物理固化至内核 (Settings Saved).");
    }, 800);
  };

  const handleGlobalReset = async () => {
    if (!confirm("【绝对警告】此操作将物理清空所有分身、记忆与中继配置。确定要执行全局重置吗？")) return;
    
    setIsResetting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/system/reset`, { method: 'POST' });
      if (response.ok) {
        localStorage.clear();
        onReset();
        window.location.reload();
      }
    } catch (e) {
      console.error("【系统重置失败】:", e);
    } finally {
      setIsResetting(false);
    }
  };

  const handleJanitorTestModeChange = async (enabled: boolean) => {
    setJanitorTestMode(enabled);
    try {
      await fetch(`${API_BASE_URL}/api/system/janitor-test-mode?enabled=${enabled}`, {
        method: "POST"
      });
    } catch (e) {
      console.error("Failed to toggle test mode", e);
    }
  };

  const tabs = [
    { id: 'profile', label: t.profile, icon: User },
    { id: 'api', label: t.api, icon: Globe },
    { id: 'engine', label: t.engine, icon: Moon },
    { id: 'changelog', label: t.changelog, icon: History },
    { id: 'about', label: t.about, icon: Info },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation */}
        <div className="w-64 border-r border-border bg-muted/20 flex flex-col p-4 gap-2">
          <div className="text-[10px] font-bold text-muted-foreground px-1 py-2 uppercase tracking-widest opacity-50">
            Configuration
          </div>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-xs transition-all",
                activeTab === tab.id 
                  ? "bg-primary text-primary-foreground shadow-md font-bold" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
          
          <div className="flex-1" />
          
          <div className="pt-4 mt-4 border-t border-border/50">
             <Button 
               className="w-full justify-center gap-2 text-xs rounded-xl h-12 shadow-lg font-bold"
               onClick={handleSaveAll}
               disabled={isSaving}
             >
               <Save className="w-4 h-4" />
               {isSaving ? t.saving : t.saveAll}
             </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-xl mx-auto">
            {activeTab === 'profile' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div className="flex items-center gap-8 p-6 bg-card border border-border rounded-[2rem] shadow-sm">
                  <div className="relative group">
                    <div className="w-28 h-28 rounded-[1.5rem] border-2 border-primary/20 overflow-hidden bg-muted flex items-center justify-center shadow-inner transition-transform group-hover:scale-[1.02]">
                      {tempAvatar ? (
                        <img src={tempAvatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-[1.5rem]">
                      <Camera className="w-6 h-6" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold tracking-tight">{t.hostUser}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t.rootAuth}
                    </p>
                    <div className="flex gap-2 pt-1">
                       <span className="text-[9px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-mono border border-primary/20">ID: 0x7E5T</span>
                       <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-2.5 py-0.5 rounded-full font-mono border border-emerald-500/20">STATUS: ACTIVE</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="p-6 bg-card border border-border rounded-[1.5rem] space-y-4 shadow-sm">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-70 px-1">{t.langSetting}</Label>
                    <div className="space-y-3">
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-4 py-2.5 bg-secondary/30 text-foreground border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-xs appearance-none cursor-pointer"
                      >
                        <option value="zh">简体中文 (Chinese)</option>
                        <option value="en">English (US)</option>
                        <option value="ja">日本語 (Japanese)</option>
                      </select>
                      <p className="text-[9px] text-muted-foreground italic leading-relaxed px-1">
                        * 该设置将物理改变系统 UI 的显示语言（当前仅支持部分界面切换）。
                      </p>
                    </div>
                  </div>

                  <div className="p-6 bg-muted/10 border border-border rounded-[1.5rem] space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-70 px-1">{t.avatarPreview}</Label>
                    <div className="flex items-center gap-6 bg-background/50 p-4 rounded-xl border border-border/50">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-border shadow-sm">
                        {tempAvatar && <img src={tempAvatar} alt="preview" className="w-full h-full object-cover" />}
                      </div>
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-border shadow-sm">
                        {tempAvatar && <img src={tempAvatar} alt="preview" className="w-full h-full object-cover" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground italic leading-relaxed max-w-[180px]">
                        {t.saveTip}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div className="bg-card border border-border rounded-[1.5rem] p-8 space-y-6 shadow-sm">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center gap-2 text-muted-foreground">
                        <Building size={14} className="text-primary" />
                        {t.modelVendor}
                      </Label>
                      <select
                        value={provider}
                        onChange={handleProviderChange}
                        className="w-full px-4 py-2.5 bg-secondary/30 text-foreground border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-xs appearance-none cursor-pointer"
                      >
                        {PROVIDERS.map(p => (
                          <option key={p.name} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center gap-2 text-muted-foreground">
                        <Cpu size={14} className="text-primary" />
                        {t.modelName}
                      </Label>
                      <Input
                        value={modelId}
                        onChange={(e) => setModelId(e.target.value)}
                        placeholder="gpt-4o-mini"
                        className="bg-secondary/30 border-border rounded-xl h-10 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-2 text-muted-foreground">
                      <Link size={14} className="text-primary" />
                      {t.apiBase}
                    </Label>
                    <Input
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://api.openai.com/v1"
                      className="bg-secondary/30 border-border rounded-xl h-10 text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-2 text-muted-foreground">
                      <Key size={14} className="text-primary" />
                      {t.apiKey}
                    </Label>
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="bg-secondary/30 border-border rounded-xl h-10 text-xs"
                    />
                  </div>

                  <div className="pt-6 flex items-center justify-between gap-4 border-t border-border/50">
                    <div className="flex-1">
                      {testStatus !== 'idle' && (
                        <div className={cn(
                          "flex items-center gap-2 text-[10px] px-4 py-2 rounded-xl w-fit font-medium",
                          testStatus === 'testing' ? "bg-blue-500/10 text-blue-500" :
                          testStatus === 'success' ? "bg-emerald-500/10 text-emerald-500" :
                          "bg-destructive/10 text-destructive border border-destructive/20"
                        )}>
                          {testStatus === 'testing' ? <Wifi size={14} className="animate-pulse" /> : 
                           testStatus === 'success' ? <CheckCircle2 size={14} /> : 
                           <AlertCircle size={14} />}
                          <span className="truncate">{testMsg}</span>
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleTestConnection}
                      disabled={testStatus === 'testing'}
                      className="rounded-xl h-9 text-xs gap-2 px-4 hover:bg-primary hover:text-white transition-all shadow-sm"
                    >
                      <Wifi className="w-3.5 h-3.5" />
                      {t.testConn}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'engine' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-400">
                {/* Janitor Incubation */}
                <div className="p-8 bg-card border border-border rounded-[1.5rem] space-y-6 shadow-sm">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Moon className="w-4 h-4 text-primary" />
                        {t.incubation}
                      </Label>
                      <span className="text-xs font-mono text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">
                        {incubationInterval} 分钟
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t.incubationTip}
                    </p>
                    <div className="pt-6 space-y-4">
                      <input 
                        type="range" min="1" max="60" step="1"
                        value={incubationInterval}
                        onChange={(e) => setIncubationInterval(parseInt(e.target.value))}
                        className="w-full accent-primary h-2 bg-muted rounded-full appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground font-mono opacity-60">
                        <span>1min (激进)</span>
                        <span>30min (平衡)</span>
                        <span>60min (稳健)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Development Mode */}
                <div className="p-8 bg-muted/20 border border-border rounded-[1.5rem] space-y-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8 blur-2xl" />
                  
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold tracking-tight">{t.diceProject}</h3>
                  </div>
                  
                  <div className="flex items-center justify-between gap-6 bg-background/50 p-4 rounded-2xl border border-border/50">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">{t.awakeMode}</Label>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {t.awakeTip}
                      </p>
                    </div>
                    <Switch 
                      checked={janitorTestMode} 
                      onCheckedChange={handleJanitorTestModeChange}
                    />
                  </div>
                  
                  <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 border-dashed">
                    <p className="text-[10px] text-amber-600/80 italic flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {t.awakeNote}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-border/50">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-bold text-destructive flex items-center gap-2 px-1 uppercase tracking-[0.2em] opacity-80">
                        <AlertTriangle className="w-3 h-3" />
                        {t.dangerZone}
                      </Label>
                      <Button 
                        variant="destructive" 
                        className="w-full text-xs h-10 gap-2 rounded-xl shadow-md hover:shadow-destructive/20 transition-all"
                        onClick={handleGlobalReset}
                        disabled={isResetting}
                      >
                        <Trash2 className="w-4 h-4" />
                        {isResetting ? "重置中..." : t.globalReset}
                      </Button>
                      <p className="text-[9px] text-center text-muted-foreground leading-relaxed">
                        {t.resetTip}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'changelog' && (
              <ScrollArea className="h-[550px] pr-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div className="space-y-10 py-2">
                  <div className="relative pl-8 border-l-2 border-primary/30 ml-2">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-background shadow-sm" />
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold tracking-tight">{t.verTitle}</h4>
                      <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">CURRENT</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-4 font-mono">2026-05-28 / Stable Core</p>
                    <ul className="space-y-2.5 text-xs text-muted-foreground">
                      <li className="flex gap-2">
                        <span className="text-primary font-bold shrink-0">▸</span>
                        <span>【国际化】新增多语言选择功能，支持汉语、英语、日语物理切换。</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-primary font-bold shrink-0">▸</span>
                        <span>【全栈收口】重构全局设置中心，物理整合个人 Profile 与 API 配置。</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-primary font-bold shrink-0">▸</span>
                        <span>【架构硬化】修复 QQ 中继 AttributeError 崩溃与 Session 重连逻辑。</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-primary font-bold shrink-0">▸</span>
                        <span>【通讯去重】物理隔离 API 广播与中继被动回复，消除双重回复 Bug。</span>
                      </li>
                    </ul>
                  </div>

                  <div className="relative pl-8 border-l-2 border-border ml-2">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-muted border-4 border-background" />
                    <h4 className="text-sm font-bold text-muted-foreground">v0.0.7 - 2026-05-27</h4>
                    <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                      <li>【意识觉醒】修复 Janitor 消息被去重故障，支持 C2C/群聊/频道全场景主动查岗</li>
                      <li>【双向同步】补全 Web ↔ QQ 消息广播链路，实现跨端人格回复即时对齐</li>
                      <li>【逻辑硬化】彻底粉碎 React Key 重复导致的渲染崩溃与气泡闪烁 Bug</li>
                      <li>【持久化】实装 Bot 外部中继配置物理存储，解决刷新网页后配置丢失问题</li>
                    </ul>
                  </div>

                  <div className="relative pl-8 border-l-2 border-border ml-2">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-muted border-4 border-background" />
                    <h4 className="text-sm font-bold text-muted-foreground">v0.0.6 - 2026-05-27</h4>
                    <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                      <li>【蒸馏优化】人格结晶预览界面引入垂直滚动容器，支持更丰富的配置项展示</li>
                      <li>【数值修正】自动识别并归一化提炼数值，解决小数显示异常</li>
                      <li>【体验升级】优化正在输入提示布局，移除多余省略号并调整动效位置</li>
                    </ul>
                  </div>

                  <div className="relative pl-8 border-l-2 border-border ml-2">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-muted border-4 border-background" />
                    <h4 className="text-sm font-bold text-muted-foreground">v0.0.5 - 2026-05-27</h4>
                    <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                      <li>【战线二】打通 QQ Bot 外部中继，支持分身在 QQ 端的数字化生存</li>
                      <li>【物理粉碎】硬化 AI 动作描写过滤器，强制剥离所有括号包裹的 RP 描写</li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'about' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div className="flex flex-col items-center gap-6 py-12 bg-card border border-border rounded-[2rem] shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  <div className="w-24 h-24 bg-muted/30 rounded-3xl flex items-center justify-center p-5 border border-border shadow-inner">
                    <img src="./logo.png" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <div className="text-center space-y-1">
                    <h2 className="text-3xl font-bold tracking-tighter">琥珀 (Amber)</h2>
                    <p className="text-xs text-muted-foreground font-mono tracking-widest opacity-60">Cognitive OS Prototype v0.1.1-beta</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 bg-muted/10 rounded-[1.5rem] border border-border group hover:border-primary/30 transition-colors">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-3 tracking-widest opacity-50">{t.coreEngine}</p>
                      <p className="text-sm font-mono font-bold">Amber-Engine v0.9</p>
                   </div>
                   <div className="p-5 bg-muted/10 rounded-[1.5rem] border border-border group hover:border-primary/30 transition-colors">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-3 tracking-widest opacity-50">{t.cogModel}</p>
                      <p className="text-sm font-mono font-bold">RAG-Distill-V2</p>
                   </div>
                </div>

                <div className="p-6 bg-primary/5 rounded-[1.5rem] border border-primary/10 text-center">
                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    {t.slogan}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
