'use client';

import React, { useState, useEffect } from 'react';
import { Mic, Upload, X, Users, Heart, GraduationCap, Sparkles, ArrowLeft, ArrowRight, Check, FileText, Image, Database, Loader2, Zap, HelpCircle, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DistillationModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onComplete?: (data: any) => void;
}

export function DistillationModal({
  isOpen = false,
  onClose = () => {},
  onComplete = () => {},
}: DistillationModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [personaType, setPersonaType] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('other');
  const [relationship, setRelationship] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [impression, setImpression] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [rawMaterial, setRawMaterial] = useState<string[]>([]);
  const [uploadedText, setUploadedText] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [refiningProgress, setRefiningProgress] = useState(0);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const [isRefined, setIsRefined] = useState(false);

  // Step 5 states
  const [coreTraits, setCoreTraits] = useState<string[]>([]);
  const [catchphrases, setCatchphrases] = useState<string[]>([]);
  const [emotions, setEmotions] = useState({ anger: 50, humor: 50, empathy: 50 });
  const [coreMemory, setCoreMemory] = useState<string>('');
  const [stability, setStability] = useState<number>(85);
  const [synchronization, setSynchronization] = useState<number>(90);
  const [chunkProgressLog, setChunkProgressLog] = useState<string>('');
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const refiningLogs = [
    "正在解析多模态原始语料...",
    "正在提取高频口头禅与表达习惯...",
    `正在分析核心性格特征与情绪阈值...`,
    `正在根据“${relationship || '未知关系'}”锚定情感权重...`,
    "正在注入 System 2 人格过滤器...",
    "正在固化为本地琥珀文件...",
    "琥珀结晶成功！"
  ];

  // Handle Step 4 simulation & LLM Extraction (Chunking Iteration)
  useEffect(() => {
    if (currentStep === 4 && isOpen && !isRefined) {
      setRefiningProgress(0);
      setCurrentLogIndex(0);
      setChunkProgressLog('准备启动蒸馏引擎...');
      
      let isCancelled = false;

      const runExtraction = async () => {
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
          
          if (!apiKey) throw new Error('未配置全局 API Key');

          // Chunking the uploaded text (approx 60000 chars per chunk to leave room for prompt)
          const lines = uploadedText.split('\n');
          const chunks: string[] = [];
          let currentChunk = "";
          for (const line of lines) {
            if (currentChunk.length + line.length > 60000) {
              chunks.push(currentChunk);
              currentChunk = line + '\n';
            } else {
              currentChunk += line + '\n';
            }
          }
          if (currentChunk) chunks.push(currentChunk);
          if (chunks.length === 0) chunks.push("");

          let accumulatedResult: any = null;

          for (let i = 0; i < chunks.length; i++) {
            if (isCancelled) break;

            // Calculate base progress for this chunk
            const baseProgress = Math.floor((i / chunks.length) * 100);
            setRefiningProgress(baseProgress);

            // Extract date range from current chunk for UI Log
            const dateRegex = /(?:20\d{2}[-年/.]\d{1,2}[-月/.]\d{1,2}[日]?|\d{1,2}月\d{1,2}日)/g;
            const matches = chunks[i].match(dateRegex);
            let dateRangeStr = "";
            if (matches && matches.length > 0) {
              dateRangeStr = `${matches[0]} 至 ${matches[matches.length - 1]}`;
            } else {
              dateRangeStr = `第 ${i + 1}/${chunks.length} 阶段数据`;
            }
            
            setChunkProgressLog(`正在深度蒸馏: [${dateRangeStr}] 的记忆切片...`);

            // Construct prompt for Map-Reduce logic
            let prompt = "";
            if (i === 0) {
              prompt = `你是一个数字生命蒸馏器。请分析语料并提炼分身画像。
【🚨 身份隔离与学习 🚨】：
1. 【严格区分主体】：准确判断谁是【被蒸馏的分身】，谁是【宿主（用户）】。禁止误植性格。
2. 【深度语言指纹学习】：捕捉分身特有的语气词、常用句式、标点习惯。
3. 【情绪诱因分析】：分析分身为什么会生气？将“易怒点”融入性格描述。

【🚨 核心记忆约束 🚨】
1. 【绝对第一人称】：回忆必须是分身主观视角。分身为‘我’，用户为‘你’。
   - 错误：‘他和某某某聊天...’
   - 正确：‘我记得那天和你在聊天...’
2. 【零幻觉】：素材来源仅限语料，禁止脑补未提及的背景。

【🚨 数值输出约束 🚨】
1. 【整数百分比】：stability, synchronization, anger, humor, empathy 必须返回 0-100 之间的整数。
   - 禁止返回 0.85 这种小数。

【与用户关系】：${relationship || '未知'}
【提取的语料】：${chunks[i]}

请返回 JSON：coreMemory, traits(数组，带简短原因描述), catchphrases(数组，分身原话), stability(0-100), synchronization(0-100), anger(0-100), humor(0-100), empathy(0-100)。`;
            } else {
              // Incremental feeding prompt
              prompt = `你是一个数字生命蒸馏器。正在进行第 ${i+1} 轮增量投喂。
【🚨 持续进化 🚨】：保持身份隔离，强化【第一人称视角】和【0-100 整数数值】约束。
上一轮状态：${JSON.stringify(accumulatedResult)}
最新语料：${chunks[i]}
请更新并返回完整 JSON 画像。`;
            }

            // Fake internal progress within the chunk
            let fakeProgress = baseProgress;
            const progressInterval = setInterval(() => {
              fakeProgress += 1;
              const maxForChunk = Math.floor(((i + 1) / chunks.length) * 100);
              if (fakeProgress < maxForChunk) {
                setRefiningProgress(fakeProgress);
              }
            }, 500);

            const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: modelId,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                response_format: { type: "json_object" }
              })
            });
            
            clearInterval(progressInterval);

            if (!response.ok) {
              const errorText = await response.text();
              let parsedError: any;
              try {
                parsedError = JSON.parse(errorText);
              } catch {
                parsedError = { error: { message: errorText } };
              }
              
              const msg = parsedError?.error?.message || errorText;
              if (response.status === 503 || msg.includes("too busy")) {
                throw new Error(`LLM 服务繁忙 (503): 算力资源暂时耗尽，请稍后再试。`);
              }
              throw new Error(`API 异常 (${response.status}): ${msg}`);
            }
            
            const data = await response.json();
            let content = data.choices[0].message.content.trim();
            
            try {
              if (content.startsWith('```json')) content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
              else if (content.startsWith('```')) content = content.replace(/^```\n?/, '').replace(/\n?```$/, '');
              accumulatedResult = JSON.parse(content);
            } catch (parseError) {
              console.error("JSON Parse Error on chunk", i, content);
              if (i === 0) throw new Error('首轮提炼大模型返回格式无法解析为 JSON');
              // If not chunk 0, just ignore this chunk's failure and keep accumulatedResult
            }
          } // end of chunk loop

          if (!isCancelled && accumulatedResult) {
            setRefiningProgress(100);
            setIsRefined(true);
            setIsFallbackMode(false);
            setErrorMessage(null);
            
            // 归一化函数：确保数值在 0-100 区间，处理大模型可能返回 0-1 的情况
            const normalize = (val: any, fallback: number) => {
              if (typeof val !== 'number') return fallback;
              if (val > 0 && val <= 1) return Math.round(val * 100);
              return Math.min(100, Math.max(0, Math.round(val)));
            };

            setCoreTraits(accumulatedResult.traits || []);
            setCatchphrases(accumulatedResult.catchphrases || []);
            setCoreMemory(accumulatedResult.coreMemory || '');
            setStability(normalize(accumulatedResult.stability, 85));
            setSynchronization(normalize(accumulatedResult.synchronization, 92));
            setEmotions({
              anger: normalize(accumulatedResult.anger, 50),
              humor: normalize(accumulatedResult.humor, 50),
              empathy: normalize(accumulatedResult.empathy, 50)
            });
          }

        } catch (e: any) {
          if (!isCancelled) {
            console.error("【琥珀蒸馏故障】详情:", e);
            setErrorMessage(e.message);
            
            // Fallback Logic
            setChunkProgressLog("[核心大脑连接中断]");
            setIsFallbackMode(true);
          }
        }
      };

      runExtraction();

      return () => { isCancelled = true; };
    }
  }, [currentStep, isOpen, relationship, isRefined, impression, uploadedText, retryCount]);

  // Reset all states when modal is closed unexpectedly
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setCurrentStep(1);
        setIsRefined(false);
        setRefiningProgress(0);
        setRawMaterial([]);
        setUploadedText('');
        setFiles([]);
        setPersonaType(null);
        setName('');
        setGender('other');
        setRelationship('');
        setAvatar(null);
        setImpression('');
        setCoreTraits([]);
        setCatchphrases([]);
        setCoreMemory('');
        setEmotions({ anger: 50, humor: 50, empathy: 50 });
        setStability(85);
        setSynchronization(90);
        setChunkProgressLog('');
        setIsFallbackMode(false);
      }, 300);
    }
  }, [isOpen]);

  const handleFinish = () => {
    // 安全地将 traits 转换为字符串数组，处理可能的对象结构
    const safeTraits = coreTraits.map(traitObj => {
      if (traitObj && typeof traitObj === 'object') {
        return (traitObj as any).trait || (traitObj as any).name || JSON.stringify(traitObj);
      }
      return String(traitObj || '');
    });

    // Combine step 5 data into impression for downstream usage
    const enhancedImpression = `${impression}\n\n[核心特质]: ${safeTraits.join(', ')}\n[情绪阈值]: 易怒(${emotions.anger}%) 幽默(${emotions.humor}%) 共情(${emotions.empathy}%)`;

    onComplete({
      personaType,
      name,
      gender,
      relationship,
      avatar,
      impression: enhancedImpression,
      files,
      coreMemory,
      traits: safeTraits,
      catchphrases,
      stability,
      synchronization,
      raw_corpus: uploadedText
    });
    onClose();
    // Reset ALL states after a short delay to allow animation to clear
    setTimeout(() => {
      setCurrentStep(1);
      setIsRefined(false);
      setRefiningProgress(0);
      setRawMaterial([]);
      setUploadedText('');
      setFiles([]);
      setPersonaType(null);
      setName('');
      setGender('other');
      setRelationship('');
      setAvatar(null);
      setImpression('');
      setCoreTraits([]);
      setCatchphrases([]);
      setCoreMemory('');
      setEmotions({ anger: 50, humor: 50, empathy: 50 });
      setStability(85);
      setSynchronization(90);
      setChunkProgressLog('');
    }, 300);
  };

  if (!isOpen) return null;

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleNext = () => {
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };

  // Predefined logic interfaces for different file types
  const processFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (['txt', 'json', 'md', 'csv', 'docx'].includes(extension || '')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        
        let processedText = text;
        // 如果是 JSON 文件，尝试将其压缩以去除无用的空格和换行，极大节省 token 并增加有效内容容量
        if (extension === 'json') {
          try {
            const parsed = JSON.parse(text);
            processedText = JSON.stringify(parsed);
          } catch (err) {
            // 解析失败则保留原文本
          }
        }

        // 取消大模型提取的上下文硬限制。采用智能分块（Chunking）增量投喂。
        const safeText = processedText;
        
        setRawMaterial(prev => {
          const lines = text.split('\n').filter(l => l.trim().length > 0).slice(0, 5);
          return [...prev, ...lines.map(l => `[${file.name}]: ${l.substring(0, 50)}...`)];
        });
        setUploadedText(prev => prev + '\n' + safeText);
      };
      reader.readAsText(file);
    } else if (['jpg', 'jpeg', 'png'].includes(extension || '')) {
      // 在纯前端环境中，我们无法真正进行高质量 OCR。
      // 为了避免生成与图片无关的“死数据”（如之前的黑客语料），
      // 我们将提取图片的文件名作为基础信息，并提示大模型这是一个视觉材料。
      setTimeout(() => {
        setRawMaterial(prev => [...prev, `[图片文件接入]: ${file.name}`]);
        setUploadedText(prev => prev + '\n' + `[用户上传了一张图片]: ${file.name}。由于当前系统暂未开启视觉解析模组，请重点依据用户的主观印象(Impression)来推测其性格。`);
      }, 1000);
    } else if (['sqlite', 'sql'].includes(extension || '')) {
      setTimeout(() => {
        setRawMaterial(prev => [...prev, `[数据库映射 ${file.name}]: 准备解析...`]);
        setUploadedText(prev => prev + '\n' + `[数据库文件]: ${file.name}`);
      }, 1500);
    } else {
      setTimeout(() => {
        setRawMaterial(prev => [...prev, `[解析文件 ${file.name}]: 提取到文件元数据...`]);
        setUploadedText(prev => prev + '\n' + `[文件]: ${file.name}`);
      }, 500);
    }
  };

  const personaTypes = [
    { id: 'colleague', icon: Users, label: '同事', desc: '专业、高效、办公导向' },
    { id: 'relationship', icon: Heart, label: '关系', desc: '亲密、情感、日常陪伴' },
    { id: 'master', icon: GraduationCap, label: '宗师', desc: '深邃、智慧、指导人生' },
  ];

  const handleCloseAndReset = () => {
    onClose();
    // Reset ALL states after a short delay to allow animation to clear
    setTimeout(() => {
      setCurrentStep(1);
      setIsRefined(false);
      setRefiningProgress(0);
      setRawMaterial([]);
      setUploadedText('');
      setFiles([]);
      setPersonaType(null);
      setName('');
      setGender('other');
      setRelationship('');
      setAvatar(null);
      setImpression('');
      setCoreTraits([]);
      setCatchphrases([]);
      setCoreMemory('');
      setEmotions({ anger: 50, humor: 50, empathy: 50 });
      setStability(85);
      setSynchronization(90);
      setChunkProgressLog('');
      setIsFallbackMode(false);
    }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-300">
        {/* Close button */}
        <div className="absolute top-6 right-6 z-10">
          <button onClick={handleCloseAndReset} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        <div className="flex min-h-[500px]">
          {/* Left sidebar - Progress */}
          <div className="w-80 bg-muted/30 border-r border-border p-8 flex flex-col justify-between">
            <div className="space-y-8">
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  第 {currentStep} 步，共 6 步
                </span>
                <div className="flex gap-2 items-center">
                  {[1, 2, 3, 4, 5, 6].map((s) => (
                    <React.Fragment key={s}>
                      <div 
                        className={cn(
                          "w-2.5 h-2.5 rounded-full transition-all duration-300",
                          currentStep >= s ? "bg-primary" : "bg-muted-foreground/20"
                        )} 
                      />
                      {s < 6 && (
                        <div 
                          className={cn(
                            "w-6 h-0.5 transition-all duration-300",
                            currentStep > s ? "bg-primary" : "bg-muted-foreground/20"
                          )} 
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl font-light tracking-tight text-foreground">
                  {currentStep === 1 && "选择家族类型"}
                  {currentStep === 2 && "添加主观印象"}
                  {currentStep === 3 && "上传记忆材料"}
                  {currentStep === 4 && "正在炼化人格"}
                  {currentStep === 5 && "人格特征预览"}
                  {currentStep === 6 && "情绪基准微调"}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {currentStep === 1 && "定义这个人格与你的核心关系基调。"}
                  {currentStep === 2 && "用你自己的话描述他们的个性、口头禅或缺点。"}
                  {currentStep === 3 && "上传对话记录或文档，作为人格提炼的基础。"}
                  {currentStep === 4 && "请稍候，系统正在从你的记忆中提取精华..."}
                  {currentStep === 5 && "确认并调整提取出的核心特征与叙事记忆。"}
                  {currentStep === 6 && "设定分身的情绪触发概率与人格稳定性参数。"}
                </p>
              </div>
            </div>

            <button
              onClick={handleBack}
              disabled={currentStep === 1 || currentStep === 4}
              className={cn(
                "text-sm font-medium transition-colors text-left flex items-center gap-2",
                currentStep > 1 && currentStep < 4 || currentStep >= 5 ? "text-muted-foreground hover:text-foreground" : "text-transparent pointer-events-none"
              )}
            >
              <ArrowLeft size={16} /> 上一步
            </button>
          </div>

          {/* Right content area */}
          <div className="flex-1 p-8 flex flex-col relative">
            <div className="flex-1">
              {/* Step 1: Type Selection */}
              {currentStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full content-center">
                  {personaTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setPersonaType(type.id)}
                      className={cn(
                        "p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-4 group",
                        personaType === type.id 
                          ? "border-primary bg-primary/5 shadow-md" 
                          : "border-border bg-card hover:border-primary/40"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                        personaType === type.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10"
                      )}>
                        <type.icon size={24} />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{type.label}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{type.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 2: Form Details */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  {/* Top Section: Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-card border border-border rounded-2xl p-6">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center justify-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase">分身头像</label>
                      <div 
                        className="w-24 h-24 rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors relative group"
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                      >
                        {avatar ? (
                          <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <Upload className="text-muted-foreground/40 group-hover:text-primary/50 transition-colors" size={24} />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Upload className="text-white" size={16} />
                        </div>
                      </div>
                      <input 
                        type="file" 
                        id="avatar-upload" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const reader = new FileReader();
                            reader.onload = (event) => setAvatar(event.target?.result as string);
                            reader.readAsDataURL(e.target.files[0]);
                          }
                        }}
                      />
                    </div>

                    {/* Form Inputs */}
                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase">称呼</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="例如：晓雨"
                          className="w-full px-4 py-2 bg-muted/30 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase">性别</label>
                        <div className="flex gap-2">
                          {[
                            { id: 'male', label: '男' },
                            { id: 'female', label: '女' },
                            { id: 'other', label: '非线性' }
                          ].map((g) => (
                            <button
                              key={g.id}
                              onClick={() => setGender(g.id)}
                              className={cn(
                                "flex-1 py-2 rounded-lg text-xs font-medium border transition-all",
                                gender === g.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 text-muted-foreground border-border hover:border-primary/30"
                              )}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase">与“我”的关系</label>
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={relationship}
                            onChange={(e) => setRelationship(e.target.value)}
                            placeholder="自定义你们的关系，如：失散多年的对手..."
                            className="w-full px-4 py-2.5 bg-muted/30 border border-primary/30 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm shadow-sm"
                          />
                          <div className="flex flex-wrap gap-2">
                            {['同事', '伴侣', '良师益友', '竞争对手', '青梅竹马', '崇拜的对象'].map((suggestion) => (
                              <button
                                key={suggestion}
                                onClick={() => setRelationship(suggestion)}
                                className={cn(
                                  "px-3 py-1.5 rounded-full text-[10px] font-medium transition-all border",
                                  relationship === suggestion
                                    ? "bg-primary/10 border-primary text-primary"
                                    : "bg-transparent border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                                )}
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section: Subjective Description */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase flex justify-between">
                      <span>主观描述 & 核心特质</span>
                      <span className={cn(
                        "font-mono",
                        impression.length > 500 ? "text-destructive" : "text-primary/60"
                      )}>{impression.length}/500</span>
                    </label>
                    <div className="relative group">
                      <textarea
                        value={impression}
                        onChange={(e) => setImpression(e.target.value.slice(0, 500))}
                        placeholder="描述他们的口头禅、怪癖或只有你们知道的细节..."
                        className="w-full h-48 px-5 py-4 bg-card text-foreground border border-border rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm leading-relaxed"
                      />
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        <button className="p-2 bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-full transition-all shadow-sm">
                          <Mic size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Files */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const droppedFiles = Array.from(e.dataTransfer.files);
                      droppedFiles.forEach(processFile);
                      setFiles(prev => [...prev, ...droppedFiles]);
                    }}
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-10 transition-all flex flex-col items-center justify-center gap-4 relative overflow-hidden",
                      isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 bg-muted/5 hover:bg-muted/10"
                    )}
                  >
                    <div className="bg-primary/10 p-4 rounded-full">
                      <Upload size={32} className="text-primary opacity-80" />
                    </div>
                    <div className="text-center">
                      <p className="text-base font-medium text-foreground">点击或拖拽上传记忆材料</p>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-2">
                        <Loader2 size={14} className="animate-spin text-primary" />
                        支持多文件并行上传
                      </p>
                    </div>
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      id="wizard-file" 
                      onChange={(e) => {
                        if (e.target.files) {
                          const selectedFiles = Array.from(e.target.files);
                          selectedFiles.forEach(processFile);
                          setFiles(prev => [...prev, ...selectedFiles]);
                        }
                      }} 
                    />
                    <button 
                      onClick={() => document.getElementById('wizard-file')?.click()} 
                      className="mt-2 px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-all active:scale-95 shadow-md"
                    >
                      选择本地文件
                    </button>
                  </div>

                  {/* File Type Hints */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                        <FileText size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-foreground">文档类</h4>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">txt, pdf, docx</p>
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                        <Image size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-foreground">视觉类</h4>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">jpg, png</p>
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                        <Database size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-foreground">数据库</h4>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">sqlite, sql, json</p>
                      </div>
                    </div>
                  </div>

                  {files.length > 0 && (
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                      {files.map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl text-xs group hover:border-primary/30 transition-all">
                          <div className="flex items-center gap-3 truncate">
                            <div className="p-1.5 bg-muted rounded-md group-hover:bg-primary/5">
                              <FileText size={14} className="text-muted-foreground group-hover:text-primary" />
                            </div>
                            <span className="truncate font-medium">{file.name}</span>
                            <span className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                          </div>
                          <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive p-1 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Refining */}
              {currentStep === 4 && (
                <div className="h-full flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700 w-full overflow-hidden">
                  <div className="flex w-full items-center justify-between px-10 relative">
                    
                    {/* Left: Raw Data Flow */}
                    <div className="w-1/3 flex flex-col gap-4 relative h-64 overflow-hidden mask-image-vertical">
                      {rawMaterial.length > 0 ? (
                        <div className="animate-slide-up space-y-4">
                          {rawMaterial.map((mat, idx) => {
                            // 极度安全的渲染：确保即便解析出奇怪的 JSON 结构，也强行转为 string 渲染，避免 React 崩溃
                            const displayMat = typeof mat === 'string' ? mat : JSON.stringify(mat);
                            return (
                              <div key={idx} className="bg-muted/30 p-3 rounded-lg border border-border text-[10px] text-muted-foreground font-mono truncate">
                                {displayMat}
                              </div>
                            );
                          })}
                          {rawMaterial.map((mat, idx) => {
                            const displayMat = typeof mat === 'string' ? mat : JSON.stringify(mat);
                            return (
                              <div key={`dup-${idx}`} className="bg-muted/30 p-3 rounded-lg border border-border text-[10px] text-muted-foreground font-mono truncate">
                                {displayMat}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4 opacity-50">
                          <div className="h-10 bg-muted rounded-lg w-full animate-pulse" />
                          <div className="h-10 bg-muted rounded-lg w-3/4 animate-pulse" />
                          <div className="h-10 bg-muted rounded-lg w-5/6 animate-pulse" />
                        </div>
                      )}
                      
                      {/* Particles flowing right */}
                      {!isRefined && (
                        <div className="absolute top-1/2 right-0 w-24 h-px bg-gradient-to-r from-transparent to-primary/50 translate-x-full animate-flow-right" />
                      )}
                    </div>

                    {/* Center: Amber Core */}
                    <div className="relative z-10 flex-shrink-0 mx-8">
                      {/* Breathing Outer Ring */}
                      <div className="absolute -inset-8 bg-primary/10 rounded-full blur-2xl animate-pulse" />
                      
                      {/* Liquid Drop Metaphor / Core */}
                      <div className="relative w-40 h-40 rounded-[2.5rem] bg-card border-2 border-primary/20 flex items-center justify-center overflow-hidden shadow-2xl transition-all duration-700">
                        {/* Filling Effect */}
                        <div 
                          className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-primary/80 to-primary/40 transition-all duration-300 ease-out shadow-[0_-10px_20px_rgba(245,158,11,0.3)]"
                          style={{ height: `${refiningProgress}%` }}
                        />
                        
                        {/* Icon Overlay */}
                        <div className="relative z-10">
                          {isRefined ? (
                            <div className="flex flex-col items-center animate-in zoom-in duration-500">
                              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-lg">
                                <Check size={32} className="text-white" strokeWidth={3} />
                              </div>
                            </div>
                          ) : (
                            <Sparkles size={48} className="text-primary group-hover:rotate-12 transition-transform animate-spin-slow mix-blend-difference" />
                          )}
                        </div>
                      </div>

                      {/* Ping Animation Rings */}
                      {!isRefined && (
                        <>
                          <div className="absolute -inset-4 border border-primary/20 rounded-[3rem] animate-ping opacity-20" />
                          <div className="absolute -inset-10 border border-primary/10 rounded-[4rem] animate-ping opacity-10" style={{ animationDelay: '0.5s' }} />
                        </>
                      )}
                    </div>

                    {/* Right: Extracted Traits Flow */}
                    <div className="w-1/3 flex flex-col gap-3 relative h-64 justify-center pl-8">
                      {!isRefined && (
                        <div className="absolute top-1/2 left-0 w-16 h-px bg-gradient-to-l from-transparent to-primary/50 -translate-x-full animate-flow-left" />
                      )}
                      
                      {refiningProgress > 30 && (
                        <div className="bg-card border border-primary/20 p-3 rounded-xl shadow-sm animate-in slide-in-from-left-4 fade-in">
                          <span className="text-xs text-primary font-medium">特质抽取中...</span>
                        </div>
                      )}
                      {refiningProgress > 60 && (
                        <div className="bg-card border border-primary/30 p-3 rounded-xl shadow-sm animate-in slide-in-from-left-4 fade-in">
                          <span className="text-xs text-primary font-medium">口头禅已捕获...</span>
                        </div>
                      )}
                      {refiningProgress > 80 && (
                        <div className="bg-card border border-primary/40 p-3 rounded-xl shadow-sm animate-in slide-in-from-left-4 fade-in">
                          <span className="text-xs text-primary font-medium">情绪阈值稳定...</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Dynamic Logs & Status */}
                  <div className="w-full max-w-md space-y-6">
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-[10px] font-mono text-muted-foreground/50 tracking-[0.2em] uppercase">
                        Amber Refining Protocol v2.0 - {refiningProgress}%
                      </div>
                      {chunkProgressLog && (
                        <div className={cn(
                          "mt-2 text-xs font-medium animate-pulse",
                          errorMessage ? "text-destructive" : "text-primary"
                        )}>
                          {chunkProgressLog}
                        </div>
                      )}
                      {errorMessage && (
                        <div className="mt-2 text-[10px] text-destructive/80 max-w-xs text-center line-clamp-2">
                          {errorMessage}
                        </div>
                      )}
                    </div>

                    {/* Action Button after Refinement or Error */}
                    <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      {isRefined && (
                        <button
                          onClick={handleNext}
                          className="px-10 py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm hover:bg-primary/90 transition-all flex items-center gap-3 active:scale-95 shadow-[0_10px_30px_rgba(245,158,11,0.3)] group"
                        >
                          查看结晶预览
                          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      )}
                      
                      {isFallbackMode && !isRefined && (
                        <div className="flex flex-col items-center gap-3">
                          <button
                            onClick={() => setRetryCount(prev => prev + 1)}
                            className="px-8 py-2.5 bg-card border-2 border-primary/20 text-primary rounded-2xl font-bold text-xs hover:bg-primary/5 transition-all flex items-center gap-2 active:scale-95 group"
                          >
                            <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                            重试物理连接
                          </button>
                          <button
                            onClick={() => {
                              // Force success with fallback data
                              setCoreTraits(['未知', '记忆碎片', '待补全']);
                              setCatchphrases(['(滋滋...) 信号不稳定...', '我似乎忘记了什么...']);
                              setCoreMemory(`[本地应急蒸馏生成] \n在与用户建立“${relationship || '未知'}”关系时，由于神经网络连接中断，我的核心记忆暂未完全具象化。我只记得一些模糊的轮廓：${impression.substring(0, 50)}...`);
                              setStability(45);
                              setSynchronization(30);
                              setEmotions({ anger: 50, humor: 50, empathy: 50 });
                              setIsRefined(true);
                              setIsFallbackMode(false);
                            }}
                            className="text-[10px] text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
                          >
                            接受本地应急蒸馏结果
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Step 5: Persona Profile Preview */}
              {currentStep === 5 && (
                <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-300">
                  <div className="flex-shrink-0 text-center pb-4 border-b border-border/50 mb-6">
                    <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/30 mx-auto flex items-center justify-center text-xl mb-2">
                      {avatar ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : "✨"}
                    </div>
                    <h3 className="text-lg font-medium text-foreground leading-tight">{name}</h3>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{relationship} | {gender === 'male' ? '男' : gender === 'female' ? '女' : '非线性'}</p>
                  </div>

                  <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Core Memory & Traits */}
                      <div className="space-y-6">
                        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 relative">
                          <div className="flex items-center">
                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                              <Database size={16} className="text-primary" />
                              核心记忆 (Core Memory)
                            </label>
                            <div className="relative group ml-1">
                              <HelpCircle className="w-4 h-4 text-gray-500 cursor-help hover:text-amber-400 transition-colors inline-block" />
                              <div className="absolute top-full left-0 mt-2 hidden group-hover:block w-64 p-3 bg-gray-900/90 backdrop-blur-md border border-amber-500/30 text-xs text-gray-300 rounded-lg shadow-lg shadow-amber-500/10 z-50 animate-fade-in">
                                提炼自历史语料中的重大人生节点，属于不可动摇的刚性认知。
                              </div>
                            </div>
                          </div>
                          <textarea
                            value={coreMemory}
                            onChange={(e) => setCoreMemory(e.target.value)}
                            className="w-full h-32 px-4 py-3 bg-muted/30 border border-border rounded-xl text-xs outline-none focus:border-primary/50 resize-none leading-relaxed"
                          />
                        </div>

                        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                          <div className="flex items-center">
                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                              <Sparkles size={16} className="text-primary" />
                              性格特质 (可编辑)
                            </label>
                            <div className="relative group ml-1">
                              <HelpCircle className="w-4 h-4 text-gray-500 cursor-help hover:text-amber-400 transition-colors inline-block" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-gray-900/90 backdrop-blur-md border border-amber-500/30 text-xs text-gray-300 rounded-lg shadow-lg shadow-amber-500/10 z-50 animate-fade-in">
                                定义分身的微观行为驱动逻辑。直接影响其回复的字数、标点符号习惯及语气冷暖。
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {coreTraits.map((traitObj, idx) => {
                              // 安全渲染逻辑：处理大模型可能返回的 {trait, reason} 对象或纯字符串
                              const traitText = (traitObj && typeof traitObj === 'object') 
                                ? ((traitObj as any).trait || (traitObj as any).name || JSON.stringify(traitObj)) 
                                : String(traitObj || '');
                              
                              return (
                                <div key={idx} className="group relative">
                                  <span className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-medium pr-7">
                                    {traitText}
                                  </span>
                                  <button 
                                    onClick={() => setCoreTraits(prev => prev.filter((_, i) => i !== idx))}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary/20 rounded-full flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              );
                            })}
                            <input 
                              type="text"
                              placeholder="+ 添加特质"
                              className="px-3 py-1.5 bg-transparent border border-dashed border-border rounded-full text-xs outline-none focus:border-primary/50 w-24"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = (e.target as HTMLInputElement).value.trim();
                                  if (val) {
                                    setCoreTraits(prev => [...prev, val]);
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: Catchphrases */}
                      <div className="space-y-6">
                        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                          <div className="flex items-center">
                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                              <Mic size={16} className="text-primary" />
                              高频口头禅
                            </label>
                            <div className="relative group ml-1">
                              <HelpCircle className="w-4 h-4 text-gray-500 cursor-help hover:text-amber-400 transition-colors inline-block" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-gray-900/90 backdrop-blur-md border border-amber-500/30 text-xs text-gray-300 rounded-lg shadow-lg shadow-amber-500/10 z-50 animate-fade-in">
                                高频特征词捕获引擎。严格锚定原始文本中的语气词或特定习惯语，拒绝通用词汇。
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {catchphrases.map((phrase, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input 
                                  type="text"
                                  value={phrase}
                                  onChange={(e) => setCatchphrases(prev => prev.map((p, i) => i === idx ? e.target.value : p))}
                                  className="flex-1 px-3 py-2 bg-muted/30 border border-border rounded-lg text-xs outline-none focus:border-primary/50"
                                />
                                <button onClick={() => setCatchphrases(prev => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive"><X size={14} /></button>
                              </div>
                            ))}
                            <button onClick={() => setCatchphrases(prev => [...prev, ''])} className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-muted-foreground">+ 添加口头禅</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 6: Emotion & Tech Indicators */}
              {currentStep === 6 && (
                <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch flex-1 pt-4 max-h-[360px]">
                    {/* Left: Emotion Thresholds */}
                    <div className="bg-card border border-border rounded-2xl p-8 space-y-8 shadow-sm flex flex-col">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                          <Heart size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h3 className="text-base font-bold">情绪波动阈值</h3>
                            <div className="relative group ml-1">
                              <HelpCircle className="w-4 h-4 text-gray-500 cursor-help hover:text-amber-400 transition-colors inline-block" />
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block w-64 p-3 bg-gray-900/90 backdrop-blur-md border border-amber-500/30 text-xs text-gray-300 rounded-lg shadow-lg shadow-amber-500/10 z-50 animate-fade-in">
                                动态情绪状态机。由后端正则引擎实时解析对话语气，动态影响分身的情感反馈倾向。
                              </div>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground">定义分身在交互中的情感反馈基准</p>
                        </div>
                      </div>
                      
                      <div className="space-y-6 flex-1 flex flex-col justify-center">
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-muted-foreground">易怒度 (Anger)</span>
                            <span className="text-primary">{emotions.anger}%</span>
                          </div>
                          <input type="range" min="0" max="100" value={emotions.anger} onChange={(e) => setEmotions(prev => ({ ...prev, anger: parseInt(e.target.value) }))} className="w-full accent-primary h-1.5 bg-muted rounded-full appearance-none cursor-pointer" />
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-muted-foreground">幽默感 (Humor)</span>
                            <span className="text-primary">{emotions.humor}%</span>
                          </div>
                          <input type="range" min="0" max="100" value={emotions.humor} onChange={(e) => setEmotions(prev => ({ ...prev, humor: parseInt(e.target.value) }))} className="w-full accent-primary h-1.5 bg-muted rounded-full appearance-none cursor-pointer" />
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-muted-foreground">共情力 (Empathy)</span>
                            <span className="text-primary">{emotions.empathy}%</span>
                          </div>
                          <input type="range" min="0" max="100" value={emotions.empathy} onChange={(e) => setEmotions(prev => ({ ...prev, empathy: parseInt(e.target.value) }))} className="w-full accent-primary h-1.5 bg-muted rounded-full appearance-none cursor-pointer" />
                        </div>
                      </div>
                    </div>

                    {/* Right: Technical Indicators */}
                    <div className="bg-card border border-border rounded-2xl p-8 space-y-8 shadow-sm flex flex-col">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                          <Zap size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h3 className="text-base font-bold">技术指标微调</h3>
                            <div className="relative group ml-1">
                              <HelpCircle className="w-4 h-4 text-gray-500 cursor-help hover:text-amber-400 transition-colors inline-block" />
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block w-64 p-3 bg-gray-900/90 backdrop-blur-md border border-amber-500/30 text-xs text-gray-300 rounded-lg shadow-lg shadow-amber-500/10 z-50 animate-fade-in">
                                调节模型生成稳定性与记忆检索命中权重，数值越高越不容易发生角色崩坏。
                              </div>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground">调节模型生成的稳定性与检索权重</p>
                        </div>
                      </div>
                      
                      <div className="space-y-6 flex-1 flex flex-col justify-center">
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-muted-foreground">人格稳定性 (Stability)</span>
                            <span className="text-primary">{stability}%</span>
                          </div>
                          <input type="range" min="0" max="100" value={stability} onChange={(e) => setStability(parseInt(e.target.value))} className="w-full accent-primary h-1.5 bg-muted rounded-full appearance-none cursor-pointer" />
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-muted-foreground">记忆同步率 (Sync Rate)</span>
                            <span className="text-primary">{synchronization}%</span>
                          </div>
                          <input type="range" min="0" max="100" value={synchronization} onChange={(e) => setSynchronization(parseInt(e.target.value))} className="w-full accent-primary h-1.5 bg-muted rounded-full appearance-none cursor-pointer" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Centered Action Area */}
                  <div className="mt-12 mb-2 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                    <button
                      onClick={handleFinish}
                      className="w-full max-w-[280px] py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 group"
                    >
                      <Database size={16} className="group-hover:rotate-12 transition-transform" />
                      确认识别并固化人格
                    </button>
                    <p className="text-[9px] text-center text-muted-foreground opacity-60">
                      固化后，该分身将立即加入您的数字家族阵列。
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom right action */}
            <div className="flex justify-end pt-6">
              {currentStep < 6 && currentStep !== 4 && (
                <button
                  onClick={handleNext}
                  disabled={(currentStep === 1 && !personaType)}
                  className={cn(
                    "px-10 py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm transition-all flex items-center gap-2 active:scale-95 shadow-xl",
                    (currentStep === 1 && !personaType) ? "opacity-50 cursor-not-allowed" : "hover:bg-primary/90 hover:shadow-primary/20"
                  )}
                >
                  下一步 <ArrowRight size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
