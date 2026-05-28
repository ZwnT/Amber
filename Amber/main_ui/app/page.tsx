"use client"

import { useState, useCallback, useEffect } from "react"
import { IconSidebar } from "@/components/amber/icon-sidebar"
import { PersonaRoster, type Persona } from "@/components/amber/persona-roster"
import { ChatWorkspace } from "@/components/amber/chat-workspace"
import { DistillationModal } from "@/components/DistillationModal"
import { PlaceholderView } from "@/components/amber/placeholder-views"
import { BotConfigModal } from "@/components/BotConfigModal"
import { GlobalAPIConfig } from "@/components/amber/GlobalAPIConfig"
import { DataMonitor } from "@/components/amber/DataMonitor"
import { IdentityDetail } from "@/components/amber/IdentityDetail"
import { UserSettingsModal } from "@/components/amber/UserSettingsModal"
import { WindowControls } from "@/components/amber/window-controls"
import { SettingsCenter } from "@/components/amber/SettingsCenter"
import { TRANSLATIONS } from "@/lib/i18n"

const initialPersonasData: Persona[] = []

interface Message {
  id: string
  content: string
  sender: "user" | "ai"
  timestamp: Date
}

const API_BASE_URL = "http://127.0.0.1:8000";

export default function AmberApp() {
  const [activeTab, setActiveTab] = useState("chat")
  const [viewMode, setViewMode] = useState<"chat" | "profile">("chat")
  const [personas, setPersonas] = useState<Persona[]>([])
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [isBotConfigOpen, setIsBotConfigOpen] = useState(false)
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false)
  const [userAvatar, setUserAvatar] = useState("")
  const [language, setLanguage] = useState("zh")

  const t = TRANSLATIONS[language] || TRANSLATIONS.zh

  // 0. 初始化读取用户配置
  useEffect(() => {
    const savedAvatar = localStorage.getItem('amber_user_avatar')
    if (savedAvatar) setUserAvatar(savedAvatar)
    
    const savedLang = localStorage.getItem('amber_language')
    if (savedLang) setLanguage(savedLang)
  }, [])

  // 1. 初始化读取 FastAPI 后端 (Personas)
  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/personas`);
        if (res.ok) {
          const data = await res.json();
          // 转换后端数据格式适配前端 Persona 接口
          const mappedPersonas: Persona[] = data.map((p: any) => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar ? "" : "✨", 
            avatarData: p.avatar,
            lastMessage: "就绪...",
            emotionStatus: "green",
            tag: p.relationship_desc || "分身",
            gender: p.gender === 'male' ? '男' : p.gender === 'female' ? '女' : '非线性',
            relationship: p.relationship_desc,
            impression: p.impression,
            coreMemory: p.core_memory,
            traits: p.traits,
            catchphrases: p.catchphrases,
            stability: p.stability,
            synchronization: p.synchronization,
            happiness: p.happiness,
            anger: p.anger,
            anxiety: p.anxiety,
            token: p.token,
            is_override_active: p.is_override_active,
            override_interval: p.override_interval,
            last_interaction_time: p.last_interaction_time,
            bot_app_id: p.bot_app_id,
            bot_app_secret: p.bot_app_secret,
            bot_token: p.bot_token
          }));
          setPersonas(mappedPersonas);
          if (mappedPersonas.length > 0 && !selectedPersonaId) {
            setSelectedPersonaId(mappedPersonas[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to fetch personas from backend", e);
      }
    };
    fetchPersonas();
  }, []);

  // 2. 当选中分身变化时，读取该分身的 Messages
  useEffect(() => {
    if (!selectedPersonaId) return;
    
    // 如果内存中已经有该分身的消息（可能是正在进行的会话），则不再强行清空
    // 只有当内存中完全没有该分身的数据时，才初始化一个空数组
    setMessages(prev => {
      if (prev[selectedPersonaId]) return prev;
      return { ...prev, [selectedPersonaId]: [] };
    });

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/chat/${selectedPersonaId}`);
        if (res.ok) {
          const data = await res.json();
          const mappedMessages: Message[] = data.map((m: any) => ({
            id: m.id,
            content: m.content,
            sender: m.role === 'user' ? 'user' : 'ai',
            timestamp: new Date(m.timestamp)
          }));
          
          setMessages(prev => {
            const existingMsgs = prev[selectedPersonaId] || [];
            const serverMsgs = mappedMessages;

            // 1. 构建一个以内容+sender为 key 的 Map 用于判重（处理同步中的消息）
            // 2. 只有带有 "temp-" 或 "typing-" 的消息才参与语义去重，防止误删历史记录
            const finalMsgsMap = new Map<string, Message>();
            
            // 先放服务器消息，它们具有最高优先级（物理 ID 权威）
            serverMsgs.forEach(m => finalMsgsMap.set(m.id, m));

            // 再放本地消息，如果 ID 冲突或内容冲突则过滤
            existingMsgs.forEach(m => {
              if (finalMsgsMap.has(m.id)) return;

              const isTemp = String(m.id).startsWith("temp-") || String(m.id).startsWith("typing-");
              if (isTemp) {
                // 语义判重：如果服务器消息里已经有了一模一样的内容，则不再重复添加本地临时消息
                const hasDuplicateContent = serverMsgs.some(sm => 
                  sm.content.trim() === m.content.trim() && sm.sender === m.sender
                );
                if (hasDuplicateContent) return;
              }

              finalMsgsMap.set(m.id, m);
            });

            const newMsgList = Array.from(finalMsgsMap.values()).sort(
              (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
            );

            // 性能优化：深度比对最后一条消息的 ID 和内容
            const lastExisting = existingMsgs[existingMsgs.length - 1];
            const lastNew = newMsgList[newMsgList.length - 1];

            if (existingMsgs.length === newMsgList.length && 
                lastExisting?.id === lastNew?.id && 
                lastExisting?.content === lastNew?.content) {
              return prev;
            }

            return { ...prev, [selectedPersonaId]: newMsgList };
          });
        }
      } catch (e) {
        console.error("Failed to fetch messages", e);
      }
    };

    fetchMessages();
    
    // 开启消息轮询 (每 3 秒同步一次)，实现手机端对话实时映射到 Web 端
    const syncInterval = setInterval(fetchMessages, 3000);
    return () => clearInterval(syncInterval);
  }, [selectedPersonaId]);


  // 3. Polling system status to sync backend mood decay with frontend UI
  useEffect(() => {
    if (!selectedPersonaId) return;

    const syncStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/system/status?persona_id=${selectedPersonaId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.current_mood) {
            setPersonas(pPrev => pPrev.map(p => {
              if (p.id === selectedPersonaId) {
                // Only update if there is a change to avoid unnecessary re-renders
                if (p.happiness !== data.current_mood.happiness ||
                    p.anger !== data.current_mood.anger ||
                    p.anxiety !== data.current_mood.anxiety) {
                  return {
                    ...p,
                    happiness: data.current_mood.happiness,
                    anger: data.current_mood.anger,
                    anxiety: data.current_mood.anxiety
                  };
                }
              }
              return p;
            }));
          }
        }
      } catch (e) {
        console.error("Failed to sync persona status", e);
      }
    };

    const interval = setInterval(syncStatus, 5000);
    return () => clearInterval(interval);
  }, [selectedPersonaId]);

  const handleResetSystem = useCallback(() => {
    if (window.confirm(language === 'zh' ? "确定要重置系统吗？注意：这只会清除前端 API 配置缓存，后端数据需通过删除数据库文件重置。" : language === 'ja' ? "システムをリセットしてもよろしいですか？注意：これはフロントエンドの API 設定キャッシュのみをクリアします。バックエンドデータはデータベースファイルを削除してリセットする必要があります。" : "Are you sure you want to reset the system? Note: This only clears the frontend API config cache. Backend data must be reset by deleting the database file.")) {
      localStorage.removeItem('amber_global_api');
      alert(language === 'zh' ? "系统前端缓存已重置。" : language === 'ja' ? "システムフロントエンドキャッシュがリセットされました。" : "System frontend cache reset.");
    }
  }, [language]);

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId) || null

  const handleDeletePersona = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/personas/${id}`, { method: 'DELETE' });
      setPersonas(prev => prev.filter(p => p.id !== id))
      setSelectedPersonaId(null)
      setViewMode("chat")
    } catch (e) {
      console.error("Failed to delete persona", e);
    }
  }, [])

  const handleAddPersona = useCallback(async (data: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name || "新分身",
          gender: data.gender || "other",
          relationship_desc: data.relationship || "",
          impression: data.impression || "",
          core_memory: data.coreMemory || "",
          traits: data.traits || [],
          catchphrases: data.catchphrases || [],
          stability: data.stability || 85.0,
          synchronization: data.synchronization || 90.0,
          is_override_active: data.is_override_active || false,
          override_interval: data.override_interval || 180,
          raw_corpus: data.raw_corpus || ""
        })
      });

      if (res.ok) {
        const p = await res.json();
        const newPersona: Persona = {
          id: p.id,
          name: p.name,
          avatar: p.avatar ? "" : "✨",
          avatarData: p.avatar,
          lastMessage: "刚刚完成蒸馏，准备开始对话...",
          emotionStatus: "gray",
          tag: p.relationship_desc || "分身",
          gender: p.gender === 'male' ? '男' : p.gender === 'female' ? '女' : '非线性',
          relationship: p.relationship_desc,
          impression: p.impression,
          coreMemory: p.core_memory,
          traits: p.traits,
          catchphrases: p.catchphrases,
          stability: p.stability,
          synchronization: p.synchronization,
          happiness: p.happiness,
          anger: p.anger,
          anxiety: p.anxiety,
          is_override_active: p.is_override_active,
          override_interval: p.override_interval
        }
        setPersonas(prev => [newPersona, ...prev])
        setSelectedPersonaId(newPersona.id)
        setViewMode("chat")
        setIsWizardOpen(false)
      } else {
        const errText = await res.text();
        console.error("Failed to create persona, server returned:", res.status, errText);
        alert(`创建分身失败，请检查控制台。\n${errText}`);
      }
    } catch (e) {
      console.error("Failed to create persona (Network Error):", e);
      alert("创建分身失败，网络异常或服务器无响应。");
    }
  }, [])

  const handleSendMessage = useCallback(
    async (content: string, targetPersonaId: string) => {
      if (!targetPersonaId) return

      const userMessage: Message = {
        id: `temp-${Date.now()}`, // 使用明确的 temp 前缀
        content,
        sender: "user",
        timestamp: new Date(),
      }

      // 仅插入一条用户消息和一条“正在输入”状态
      const aiMessageId = `typing-${Date.now()}`;
      const initialAiMessage: Message = {
        id: aiMessageId,
        content: t.typing,
        sender: "ai",
        timestamp: new Date(),
      }

      setMessages((prev) => {
        const currentMsgs = prev[targetPersonaId] || [];
        // 检查是否已经存在相同内容的消息（防止极速重复点击）
        if (currentMsgs.some(m => m.content === content && m.sender === "user" && Date.now() - m.timestamp.getTime() < 1000)) {
          return prev;
        }
        return {
          ...prev,
          [targetPersonaId]: [...currentMsgs, userMessage, initialAiMessage],
        };
      });

      try {
        const configStr = localStorage.getItem('amber_global_api');
        let apiKey = '';
        let baseUrl = 'https://api.openai.com/v1';
        let modelId = 'gpt-4o-mini';

        if (configStr) {
          const config = JSON.parse(configStr);
          apiKey = config.apiKey || '';
          baseUrl = config.baseUrl || baseUrl;
          modelId = config.modelId || modelId;
        }

        // Call backend Chat API
        const res = await fetch(`${API_BASE_URL}/api/chat/${targetPersonaId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: content,
            api_key: apiKey,
            base_url: baseUrl,
            model_id: modelId
          })
        });

        if (!res.ok) {
          throw new Error(`Chat API failed: ${res.status}`);
        }

        const responseData = await res.json();
        
        // 物理防护：检查响应数据是否合法，防止 Cannot read properties of null 报错
        if (!responseData) {
          throw new Error("后端返回了空响应 (null)");
        }
        
        if (responseData.error) {
          throw new Error(responseData.error);
        }

        const aiMessageData = responseData.message;
        const serverUserMsgId = responseData.user_message_id;
        const updatedPersona = responseData.persona;

        if (!aiMessageData || !updatedPersona) {
          throw new Error("后端响应数据结构不完整");
        }
        
        // Map backend response to frontend Message
        const newAiMsg: Message = {
          id: aiMessageData.id,
          content: aiMessageData.content,
          sender: 'ai',
          timestamp: new Date(aiMessageData.timestamp)
        };

        setMessages((prev) => {
          const currentMsgs = prev[targetPersonaId] || [];
          return {
            ...prev,
            [targetPersonaId]: currentMsgs.map(m => {
              if (m.id === aiMessageId) return newAiMsg;
              // 将本地临时 ID 替换为服务器真实 ID，防止轮询去重失败
              if (m.id === userMessage.id) return { ...m, id: serverUserMsgId };
              return m;
            })
          };
        });

        // Update lastMessage and emotion state of the persona
        setPersonas(pPrev => pPrev.map(p => {
          if (p.id === targetPersonaId) {
            return { 
              ...p, 
              lastMessage: newAiMsg.content,
              happiness: updatedPersona.happiness,
              anger: updatedPersona.anger,
              anxiety: updatedPersona.anxiety
            };
          }
          return p;
        }));

      } catch (error) {
        console.error("Chat Error:", error);
        setMessages((prev) => {
          const currentMsgs = prev[targetPersonaId] || [];
          const aiResponse = t.systemError;
          
          setPersonas(pPrev => pPrev.map(p => {
              if (p.id === targetPersonaId) {
                  return { ...p, lastMessage: aiResponse };
              }
              return p;
          }));

          return {
            ...prev,
            [targetPersonaId]: currentMsgs.map(m => 
              m.id === aiMessageId 
                ? { ...m, content: aiResponse }
                : m
            ),
          };
        });
      }
    },
    [personas]
  )

  const currentMessages = selectedPersonaId ? messages[selectedPersonaId] || [] : []

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background select-none">
      {/* 🟢 Electron Native Title Bar (Dedicated Row - WeChat Style) */}
      <div 
        className="h-8 w-full flex items-center justify-between bg-sidebar shrink-0"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <div className="flex-1" />
        
        {/* Window Controls - Isolated from drag */}
        <div className="flex h-full items-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <WindowControls />
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        <IconSidebar 
          activeItem={activeTab} 
          onItemClick={(item) => {
            if (item === "add") {
              setIsWizardOpen(true)
            } else {
              setActiveTab(item)
            }
          }} 
          t={t}
        />
        {activeTab === "chat" ? (
          <>
            <PersonaRoster
              personas={personas}
              selectedId={selectedPersonaId}
              onSelect={(id) => {
                setSelectedPersonaId(id)
                setViewMode("chat")
              }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              t={t}
            />
            {viewMode === "chat" ? (
              <ChatWorkspace
                persona={selectedPersona}
                messages={currentMessages}
                onSendMessage={(content) => handleSendMessage(content, selectedPersonaId!)}
                onOpenConfig={() => setIsBotConfigOpen(true)}
                onOpenProfile={() => setViewMode("profile")}
                t={t}
              />
            ) : (
              <IdentityDetail 
                persona={selectedPersona} 
                onBack={() => setViewMode("chat")}
                onDelete={handleDeletePersona}
                onUpdate={(updatedPersona) => {
                  setPersonas(prev => prev.map(p => 
                    p.id === updatedPersona.id ? { 
                      ...p, 
                      name: updatedPersona.name,
                      avatarData: updatedPersona.avatar,
                      avatar: updatedPersona.avatar ? "" : "✨",
                      coreMemory: updatedPersona.coreMemory,
                      traits: updatedPersona.traits,
                      stability: updatedPersona.stability,
                      synchronization: updatedPersona.synchronization
                    } : p
                  ));
                }}
                language={language}
              />
            )}
          </>
        ) : activeTab === "monitor" ? (
          <DataMonitor activePersonaId={selectedPersonaId} language={language} />
        ) : activeTab === "settings" ? (
          <SettingsCenter 
            userAvatar={userAvatar}
            onSaveAvatar={(avatar) => {
              setUserAvatar(avatar)
              localStorage.setItem('amber_user_avatar', avatar)
            }}
            onReset={handleResetSystem}
            language={language}
            setLanguage={(lang) => {
              setLanguage(lang)
              localStorage.setItem('amber_language', lang)
            }}
          />
        ) : (
          <PlaceholderView type={activeTab as any} onReset={handleResetSystem} />
        )}
      </div>
      <DistillationModal 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)} 
        onComplete={handleAddPersona}
      />
      <BotConfigModal 
        isOpen={isBotConfigOpen} 
        onClose={() => setIsBotConfigOpen(false)} 
        persona={selectedPersona}
        language={language}
      />
    </div>
  )
}
