from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from contextlib import contextmanager
import uuid
import json
import asyncio
from datetime import datetime, timezone
import botpy
from botpy import logging
from botpy.message import DirectMessage, Message as QQMessage

from database import SessionLocal, Persona, Message, PersonaCorpus
from pydantic import BaseModel
from typing import List, Optional

@contextmanager
def get_db_context():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- LLM 调用增强：自动重试机制 ---
async def call_llm_with_retry(client, model, messages, temperature=0.7, response_format=None, max_retries=3):
    """
    带指数退避的 LLM 调用工具，物理对抗 503 (Service Unavailable) 和 429 (Rate Limit)
    """
    for attempt in range(max_retries):
        try:
            params = {
                "model": model,
                "messages": messages,
                "temperature": temperature
            }
            if response_format:
                params["response_format"] = response_format
                
            response = await client.chat.completions.create(**params)
            return response
        except Exception as e:
            error_str = str(e).lower()
            # 识别 503 Service Unavailable 或 429 Rate Limit
            is_transient = "503" in error_str or "429" in error_str or "service_unavailable" in error_str or "too busy" in error_str
            
            if is_transient and attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2 # 2s, 4s, 6s...
                print(f"【LLM 物理重试】检测到服务繁忙 ({attempt + 1}/{max_retries})，{wait_time}s 后重连...")
                await asyncio.sleep(wait_time)
            else:
                # 无法恢复的错误（如 401, 400）或超过重试次数，直接抛出
                raise e

# --- Pydantic 模型 ---
class PersonaBase(BaseModel):
    name: str
    gender: str
    relationship_desc: str
    impression: str
    avatar: Optional[str] = None
    token: Optional[str] = None
    core_memory: str
    traits: List[str]
    catchphrases: List[str]
    stability: float
    synchronization: float
    is_override_active: Optional[bool] = False
    override_interval: Optional[int] = 180
    bot_app_id: Optional[str] = None
    bot_app_secret: Optional[str] = None
    bot_token: Optional[str] = None

class PersonaCreate(PersonaBase):
    id: Optional[str] = None
    raw_corpus: Optional[str] = None

class PersonaResponse(PersonaBase):
    id: str
    happiness: float
    anger: float
    anxiety: float
    last_interaction_time: Optional[datetime] = None
    last_relay_context: Optional[str] = None

    class Config:
        orm_mode = True

class MessageBase(BaseModel):
    persona_id: str
    role: str
    content: str
    is_filtered: bool = False

class MessageCreate(MessageBase):
    pass

class ChatRequest(BaseModel):
    content: str
    api_key: Optional[str] = None
    base_url: Optional[str] = "https://api.openai.com/v1"
    model_id: Optional[str] = "gpt-4o-mini"

class MessageResponse(MessageBase):
    id: int
    timestamp: str

    class Config:
        orm_mode = True

app = FastAPI(title="Amber Engine API", description="数字生命核心引擎")

# --- QQ Bot 分身级控制中心 ---
class QQBotRelay:
    def __init__(self):
        self.relays = {} # persona_id -> {client, task, is_connected, appid, api_config}
        self.processed_msg_ids = set() # 全局消息 ID 去重池

    async def start(self, persona_id: str, appid: str, secret: str, api_key: str = None, base_url: str = None, model_id: str = None):
        if persona_id in self.relays and self.relays[persona_id].get("is_connected"):
            # 如果已经连接，先停止旧的
            await self.stop(persona_id)

        api_config = {
            "api_key": api_key,
            "base_url": base_url,
            "model_id": model_id
        }
        
        # 引用外部的 processed_msg_ids
        processed_pool = self.processed_msg_ids

        class AmberQQClient(botpy.Client):
            def __init__(self, target_persona_id, api_config, app_id, *args, **kwargs):
                super().__init__(*args, **kwargs)
                self.target_persona_id = target_persona_id
                self.api_config = api_config
                self.app_id = app_id

            async def on_ready(self):
                print(f"【战线二：QQ 中继】机器人已上线！(AppID: {self.app_id})")

            async def on_error(self, exception):
                print(f"【战线二：QQ 中继】物理链路故障 (AppID: {self.app_id}): {exception}")

            # 1. 频道相关事件
            async def on_at_message_create(self, message: QQMessage):
                await self.process_qq_message(message)
            
            async def on_direct_message_create(self, message: DirectMessage):
                await self.process_qq_message(message)

            # 2. 群聊与私聊 (C2C) 相关事件 - 针对新版开放平台
            async def on_group_at_message_create(self, message):
                await self.process_qq_message(message)
            
            async def on_c2c_message_create(self, message):
                await self.process_qq_message(message)

            async def process_qq_message(self, message):
                msg_id = getattr(message, "id", None)
                if not msg_id: return
                
                # --- 物理去重拦截 ---
                # 使用 msg_id 进行严格去重
                if msg_id in processed_pool:
                    return 
                processed_pool.add(msg_id)
                # 保持去重池大小
                if len(processed_pool) > 1000:
                    processed_pool.pop() 

                # 记录交互上下文
                current_ctx = None
                now_str = datetime.now(timezone.utc).isoformat()
                if hasattr(message, "guild_id"):
                    current_ctx = {"type": "direct", "guild_id": message.guild_id, "msg_id": message.id, "timestamp": now_str}
                elif hasattr(message, "group_openid"):
                    current_ctx = {"type": "group", "group_openid": message.group_openid, "msg_id": message.id, "timestamp": now_str}
                elif hasattr(message, "author") and hasattr(message.author, "user_openid"):
                    current_ctx = {"type": "c2c", "openid": message.author.user_openid, "msg_id": message.id, "timestamp": now_str}
                
                if current_ctx:
                    self.last_msg_context = current_ctx
                    with get_db_context() as db:
                        p = db.query(Persona).filter(Persona.id == self.target_persona_id).first()
                        if p:
                            p.last_relay_context = json.dumps(current_ctx)
                            db.commit()                
                # 获取纯文本内容，剥离 @ 标签
                raw_content = getattr(message, "content", "")
                # 尝试获取处理后的纯文本 (有些 SDK 版本支持处理后的文本)
                content = raw_content.strip()
                
                # 如果是群聊 @，内容通常带有 <@!ID>，需要剥离
                import re
                content = re.sub(r'<@!\d+>', '', content).strip()
                
                if not content:
                    return

                print(f"【战线二：QQ 中继】接收 -> 来自 {getattr(message.author, 'username', '未知用户')}: {content}")
                
                with get_db_context() as db:
                    persona = db.query(Persona).filter(Persona.id == self.target_persona_id).first()
                    if not persona: 
                        print(f"【战线二：QQ 中继】物理隔离：找不到分身 ID {self.target_persona_id}，正在紧急关停僵尸进程...")
                        # 尝试停止这个不存在的分身的中继
                        asyncio.create_task(qq_relay.stop(self.target_persona_id))
                        return
                    
                    chat_req = ChatRequest(
                        content=content,
                        api_key=self.api_config.get("api_key"),
                        base_url=self.api_config.get("base_url"),
                        model_id=self.api_config.get("model_id")
                    )
                    
                    try:
                        # 核心加固：从 QQ 端接收的消息，由 process_qq_message 统一负责回复，
                        # handle_chat_internal 内部必须 skip_relay，防止发生重复回复（Double Reply）。
                        response = await handle_chat_internal(self.target_persona_id, chat_req, db, skip_relay=True)
                        
                        if "error" in response:
                            print(f"【战线二：QQ 中继】内核回复异常: {response['error']}")
                            return
                            
                        ai_reply = response["message"]["content"]
                        
                        # 根据消息类型选择回复 API
                        if hasattr(message, "reply"):
                            await message.reply(content=ai_reply)
                        elif isinstance(message, DirectMessage):
                            await self.api.post_dms_messages(guild_id=message.guild_id, content=ai_reply, msg_id=message.id)
                        elif hasattr(self.api, "post_group_message") and hasattr(message, "group_openid"):
                            # 针对新版群聊 API
                            await self.api.post_group_message(group_openid=message.group_openid, msg_type=0, content=ai_reply, msg_id=message.id)
                        elif hasattr(self.api, "post_c2c_message") and hasattr(message, "author"):
                            # 针对新版私聊 API
                            await self.api.post_c2c_message(openid=message.author.user_openid, msg_type=0, content=ai_reply, msg_id=message.id)
                        
                        print(f"【战线二：QQ 中继】分身 {persona.name} 已成功同步回复。")
                    except Exception as e:
                        print(f"【战线二：QQ 中继】回复流程物理故障: {e}")

        async def run_bot():
            retry_count = 0
            while persona_id in self.relays:
                # 每次重连都实例化一个新的 Client，确保状态完全清理
                current_client = AmberQQClient(
                    target_persona_id=persona_id, 
                    api_config=api_config, 
                    app_id=appid, 
                    intents=botpy.Intents.all()
                )
                
                # 同步更新外部引用，确保 stop() 能正确关闭当前活跃的 client
                if persona_id in self.relays:
                    self.relays[persona_id]["client"] = current_client

                try:
                    print(f"【战线二：QQ 中继】正在建立物理连接 (尝试 {retry_count + 1})...")
                    await current_client.start(appid=appid, secret=secret)
                except Exception as e:
                    print(f"【战线二：QQ 中继】连接异常中断: {e}")
                
                # 如果 persona_id 还在 relays 中，说明不是手动停止，尝试重连
                if persona_id in self.relays:
                    retry_count += 1
                    wait_time = min(2 ** retry_count, 60) # 指数退避
                    print(f"【战线二：QQ 中继】物理链路断开，{wait_time} 秒后尝试自动重连...")
                    await asyncio.sleep(wait_time)
                else:
                    break

        task = asyncio.create_task(run_bot())
        self.relays[persona_id] = {
            "client": None, # 初始为 None，由 run_bot 内部赋值
            "task": task,
            "is_connected": True,
            "appid": appid,
            "api_config": api_config
        }
        print(f"【战线二：QQ 中继】分身 {persona_id} (AppID: {appid}) 热启动成功，已挂载 API 认知链。")

    async def stop(self, persona_id: str):
        if persona_id in self.relays:
            relay = self.relays[persona_id]
            if relay["client"]:
                await relay["client"].close()
            if relay["task"]:
                relay["task"].cancel()
            del self.relays[persona_id]
            print(f"【战线二：QQ 中继】分身 {persona_id} 已物理断开。")

    def get_status(self, persona_id: str):
        relay = self.relays.get(persona_id)
        if relay:
            return {"is_connected": relay["is_connected"], "appid": relay["appid"]}
        return {"is_connected": False, "appid": ""}

qq_relay = QQBotRelay()

# 辅助函数：内部对话内核调用
async def handle_chat_internal(persona_id: str, req: ChatRequest, db: Session, is_automated: bool = False, skip_relay: bool = False):
    import time
    t0 = time.perf_counter()
    # 强制物理打印，确保 Windows 终端能看到
    import sys
    sys.stdout.write("\n>>> [PROFILING START] <<<\n")
    sys.stdout.flush()
    global system_stats
    
    # 1. Check persona
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        return {"error": "Persona not found"}
    
    # 2. Save User Message
    user_msg = Message(persona_id=persona_id, role="user", content=req.content, is_filtered=is_automated)
    db.add(user_msg)
    
    is_hard_pinned = False
    clean_msg = req.content.strip()
    
    if not is_automated:
        if clean_msg.startswith("记住") or "记住" in clean_msg:
            is_hard_pinned = True
            core_text = clean_msg.replace("记住", "").lstrip("，,：: ").strip()
            if core_text:
                user_corpus = PersonaCorpus(persona_id=persona_id, content=f"【钢印记忆】：{core_text}", weight=1.0, is_pinned=True)
            else:
                user_corpus = PersonaCorpus(persona_id=persona_id, content=f"用户：{req.content}")
        else:
            user_corpus = PersonaCorpus(persona_id=persona_id, content=f"用户：{req.content}")
            
        db.add(user_corpus)
    
    # 更新最后交互时间 (使用带时区的 UTC 保证前后端对齐)
    persona.last_interaction_time = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(persona)
    
    # 3. RAG Memory Recall
    t_rag_start = time.perf_counter()
    all_corpus = db.query(PersonaCorpus).filter(PersonaCorpus.persona_id == persona_id).all()
    
    # 模拟数据量大的情况，如果真的是为了 Profiling，我们可以强制打印
    print(f"=== [DEBUG] 检索到语料条数: {len(all_corpus)} ===")
    
    if is_automated:
        scored_corpus = []
        for c in reversed(all_corpus):
            if "【钢印记忆】" in c.content or "用户：" in c.content:
                scored_corpus.append((1.0, c.content, 1.0, True))
                if len(scored_corpus) >= 3: break
    else:
        user_chars = set(req.content.replace(" ", "").replace("，", "").replace("。", "").replace("？", "").replace("！", ""))
        scored_corpus = []
        for c in all_corpus:
            c_chars = set(c.content)
            overlap = len(user_chars.intersection(c_chars))
            score = overlap * c.weight
            scored_corpus.append((score, c.content, c.weight, c.is_pinned))
        
        scored_corpus.sort(key=lambda x: x[0], reverse=True)
    
    if not is_automated:
        absolute_truths = [c[1] for c in scored_corpus if c[3] and c[0] > 0][:3]
        regular_corpus = [c[1] for c in scored_corpus if not c[3] and c[0] > 0][:3]
        
        if len(absolute_truths) + len(regular_corpus) < 3:
            extra_pinned = [c[1] for c in scored_corpus if c[3] and c[1] not in absolute_truths][:3]
            absolute_truths.extend(extra_pinned)

        core_memories_text = "\n".join(list(set(absolute_truths + regular_corpus))) if (absolute_truths or regular_corpus) else "暂无相关的深层记忆被唤醒。"
    else:
        core_memories_text = "\n".join([c[1] for c in scored_corpus]) if scored_corpus else "暂无相关的深层记忆被唤醒。"

    # --- 物理熔断：限制 RAG 回捞的最大字符长度 (1000 字) ---
    if len(core_memories_text) > 1000:
        core_memories_text = core_memories_text[:1000] + "\n[...RAG 记忆字数过长已熔断]"
    
    t1 = time.perf_counter() - t_rag_start
    sys.stdout.write(f"=== [PROFILING] t1: 执行 SQLite 记忆回捞耗时 = {t1:.4f}s ===\n")
    sys.stdout.flush()

    # 4. Construct System Prompt (Refactored)
    try:
        traits_list = json.loads(persona.traits)
        traits_text = traits_list[0] if traits_list else "意识重塑 [情绪阈值]: 50% 50% 50%"
    except:
        traits_text = str(persona.traits)

    # 提取数值用于动态指令
    import re
    anger_val = 50
    humor_val = 50
    empathy_val = 50
    m = re.search(r"易怒\((\d+)%\).*?幽默\((\d+)%\).*?共情\((\d+)%\)", traits_text)
    if m:
        anger_val, humor_val, empathy_val = int(m.group(1)), int(m.group(2)), int(m.group(3))

    mood_logic_instruction = f"你的性格特质数值为：易怒({anger_val}%)、幽默({humor_val}%)、共情({empathy_val}%)。数值越高，表现越极端且频繁。"
    behavior_prompts = []
    if anger_val >= 70: behavior_prompts.append(f"- 你当前处于高易怒状态 ({anger_val}%)。对话中应表现出明显的侵略性。")
    elif anger_val <= 30: behavior_prompts.append(f"- 你当前处于高包容状态 ({anger_val}%)。用温柔安抚宿主。")
    if humor_val >= 70: behavior_prompts.append(f"- 你非常幽默且极具反讽天赋 ({humor_val}%)。")
    if empathy_val >= 70: behavior_prompts.append(f"- 你极具共情力 ({empathy_val}%)。")
    
    behavior_block = f"\n### ⚡ 性格染色强效指令\n{chr(10).join(behavior_prompts)}\n" if behavior_prompts else ""

    system_prompt = f"""{behavior_block}
【🚨 物理输出红线 🚨】：
1. 必须在回复末尾附带：[MOOD: {{"happiness": X, "anger": Y, "anxiety": Z}}]。
   - X, Y, Z 取值范围为 [-5, 5] 之间的整数。
   - 极其轻微的互动（如打招呼、废话）请给 0 或 1。
2. {mood_logic_instruction}
3. 【禁止描写】：绝对禁止任何动作、心理、神态描写，严禁使用括号。

【🔥 真人打字习惯 🔥】：
- 字数限制 10-25 字，长句用 ||| 分隔。
- 禁止句号，用空格断句。

【主体身份认同】：
你是【{persona.name}】，对方是【宿主】。

### 🧠 意识深处沉淀的记忆（Core Memories）
{core_memories_text}

【System 2 过滤器】：完全沉浸角色，忘掉 AI 身份。"""

    # 5. Call LLM (Simplification for Internal Use)
    history = db.query(Message).filter(Message.persona_id == persona_id).order_by(Message.timestamp.desc()).limit(20).all()
    history.reverse()
    messages_payload = [{"role": "system", "content": system_prompt}]
    for m_hist in history[:-1]: # exclude current user_msg which will be added below
        messages_payload.append({"role": m_hist.role, "content": m_hist.content})
    messages_payload.append({"role": "user", "content": req.content})

    t2_content = json.dumps(messages_payload, ensure_ascii=False)
    sys.stdout.write(f"=== [PROFILING] t2: 组装好最终 Prompt 的字符总长度 = {len(t2_content)} 字符 ===\n")
    sys.stdout.flush()

    ai_content = ""
    
    # 模拟 API 获取逻辑
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=req.api_key, base_url=req.base_url or "https://api.openai.com/v1")
        t_llm_start = time.perf_counter()
        response = await call_llm_with_retry(
            client=client,
            model=req.model_id or "gpt-4o-mini",
            messages=messages_payload,
            temperature=0.7
        )
        t3 = time.perf_counter() - t_llm_start
        sys.stdout.write(f"=== [PROFILING] t3: 调用大模型并拿到返回耗时 = {t3:.4f}s ===\n")
        sys.stdout.flush()
        ai_raw = response.choices[0].message.content.strip()
        
        # 处理标签与过滤 (物理加固：兼容带括号与不带括号的情况)
        match = re.search(r'\[?MOOD:\s*(\{.*?\})\]?', ai_raw, re.DOTALL)
        if match:
            try:
                mood_data = json.loads(match.group(1).strip())
                
                # --- 情绪动态阻尼系统 (Emotion Damping) ---
                # 1. 长度衰减：输入太短（如“嗨”），情绪波动权重降至 20%
                msg_len = len(req.content.strip())
                damping = 1.0
                if msg_len <= 2: damping = 0.2
                elif msg_len <= 5: damping = 0.5
                
                # 2. 物理限压：单次对话单项情绪波动绝对值不得超过 5
                h_delta = max(-5, min(5, mood_data.get("happiness", 0))) * damping
                a_delta = max(-5, min(5, mood_data.get("anger", 0))) * damping
                x_delta = max(-5, min(5, mood_data.get("anxiety", 0))) * damping
                
                persona.happiness = max(0, min(100, persona.happiness + h_delta))
                persona.anger = max(0, min(100, persona.anger + a_delta))
                persona.anxiety = max(0, min(100, persona.anxiety + x_delta))
                
                print(f"【认知引擎】情绪波动校准: ΔH:{h_delta:.1f} ΔA:{a_delta:.1f} ΔX:{x_delta:.1f} (阻尼: {damping})")
            except Exception as e:
                print(f"【认知引擎】情绪标签解析失败: {e}")
                
            ai_content = re.sub(r'\s*\[?MOOD:.*?\]?\s*', '', ai_raw, flags=re.DOTALL).strip()
        else:
            ai_content = ai_raw
        
        ai_content = re.sub(r'\(.*?\)|（.*?）|\[.*?\]|【.*?】', '', ai_content, flags=re.DOTALL).strip()
        ai_content = ai_content.replace("|||", "\n").strip()
    except Exception as e:
        ai_content = f"[系统异常] {str(e)}"

    # 6. Save AI Response
    ai_msg = Message(persona_id=persona_id, role="assistant", content=ai_content, is_filtered=False)
    db.add(ai_msg)
    db.add(PersonaCorpus(persona_id=persona_id, content=f"AI({persona.name})：{ai_content}", weight=1.0))
    
    # 7. 更新最后互动时间 (用于主动越界查岗)
    persona.last_interaction_time = datetime.utcnow()
    
    db.commit()
    db.refresh(ai_msg)

    # --- 战线二：全场景消息广播 ---
    if not is_automated and not skip_relay:
        is_relay_online = persona_id in qq_relay.relays and qq_relay.relays[persona_id].get("is_connected")
        if is_relay_online:
            relay_info = qq_relay.relays[persona_id]
            client = relay_info["client"]
            ctx = getattr(client, "last_msg_context", None)
            if not ctx and persona.last_relay_context:
                try:
                    ctx = json.loads(persona.last_relay_context)
                except: ctx = None
            if ctx:
                try:
                    # 检查推送窗口是否已关闭 (腾讯被动回复有效期一般为 5 分钟)
                    ctx_time_str = ctx.get("timestamp")
                    if ctx_time_str:
                        ctx_time = datetime.fromisoformat(ctx_time_str)
                        if (datetime.now(timezone.utc) - ctx_time).total_seconds() > 300:
                            add_system_log(f"【认知穿透】分身 {persona.name} 物理下发取消：QQ 回复窗口已超过 5 分钟。")
                        else:
                            relay_content_ai = ai_content
                            # 消息内容防重：在末尾添加微小的隐形字符，防止腾讯“消息被去重”拦截
                            unique_suffix = f"\u200b" # 零宽空格
                            
                            # 随机 msg_seq 生成，物理隔离去重逻辑
                            import random
                            msg_seq = random.randint(1000, 999999)
                            
                            if ctx["type"] == "direct":
                                await client.api.post_dms_messages(guild_id=ctx["guild_id"], content=relay_content_ai + unique_suffix, msg_id=ctx["msg_id"], msg_seq=msg_seq)
                            elif ctx["type"] == "group":
                                await client.api.post_group_message(group_openid=ctx["group_openid"], msg_type=0, content=relay_content_ai + unique_suffix, msg_id=ctx["msg_id"], msg_seq=msg_seq)
                            elif ctx["type"] == "c2c":
                                target_openid = ctx.get("openid") or getattr(client, "last_msg_context", {}).get("openid")
                                if target_openid:
                                    await client.api.post_c2c_message(openid=target_openid, msg_type=0, content=relay_content_ai + unique_suffix, msg_id=ctx["msg_id"], msg_seq=msg_seq)
                            
                            add_system_log(f"【认知穿透】分身 {persona.name} 的人格回复已物理下发至 QQ (Seq: {msg_seq})。")
                except Exception as e:
                    add_system_log(f"【认知穿透】物理下发失败: {e}")
    
    end_time = time.perf_counter()
    latency_ms = int((end_time - t0) * 1000)
    system_stats["last_latency_ms"] = latency_ms
    sys.stdout.write(f"=== [PROFILING] Total handle_chat_internal latency: {latency_ms}ms ===\n")
    sys.stdout.write(">>> [PROFILING END] <<<\n\n")
    sys.stdout.flush()
    
    return {
            "message": {"id": str(ai_msg.id), "persona_id": ai_msg.persona_id, "role": ai_msg.role, "content": ai_content, "is_filtered": ai_msg.is_filtered, "timestamp": ai_msg.timestamp.isoformat()},
            "user_message_id": str(user_msg.id),
            "persona": {"happiness": persona.happiness, "anger": persona.anger, "anxiety": persona.anxiety}
        }

# --- QQ Bot API 路由 ---
class RelayConfigRequest(BaseModel):
    bot_type: str
    appid: str
    secret: str
    persona_id: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model_id: Optional[str] = None

@app.post("/api/relay/test")
async def test_relay(req: RelayConfigRequest):
    if req.bot_type != "QQ Bot":
        raise HTTPException(status_code=400, detail="Unsupported bot type")
    try:
        # 简单本地校验
        if not req.appid.isdigit() or len(req.appid) < 8:
            raise Exception("AppID 格式不正确")
        
        # 物理鉴权预检：尝试调用腾讯 Token API 验证 Secret
        import aiohttp
        auth_url = "https://bots.qq.com/app/getAppAccessToken"
        payload = {
            "appId": req.appid,
            "clientSecret": req.secret
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(auth_url, json=payload, timeout=5) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if "access_token" in data:
                        return {"status": "success", "message": "腾讯中继鉴权通过，配置合法！"}
                    else:
                        err_msg = data.get("message", "AppID 或 AppSecret 匹配失败")
                        raise Exception(err_msg)
                else:
                    raise Exception(f"腾讯服务器响应异常 (HTTP {resp.status})")
                    
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"鉴权预检失败: {str(e)}")

@app.post("/api/relay/connect")
async def connect_relay(req: RelayConfigRequest):
    # 这里我们允许传入 persona_id 来绑定特定分身
    persona_id = getattr(req, "persona_id", None)
    if not persona_id:
        # 兼容旧逻辑：如果没传 ID，默认取第一个分身
        with get_db_context() as db:
            p = db.query(Persona).first()
            if not p: raise HTTPException(status_code=404, detail="No persona found")
            persona_id = p.id
            
    await qq_relay.start(persona_id, req.appid, req.secret, api_key=req.api_key, base_url=req.base_url, model_id=req.model_id)
    return {"status": "connected", "persona_id": persona_id}

@app.post("/api/relay/disconnect")
async def disconnect_relay(persona_id: str):
    await qq_relay.stop(persona_id)
    return {"status": "disconnected"}

@app.get("/api/relay/status/{persona_id}")
async def get_relay_status(persona_id: str):
    return qq_relay.get_status(persona_id)

# 系统运行监控指标
@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

# 全局系统监控状态
system_stats = {
    "last_latency_ms": 0,
    "janitor_deleted_last_min": 0,
    "janitor_last_run": None,
    "janitor_test_mode": False,
    "logs": [],
    "incubation_interval_min": 5 # 睡梦扫描默认 5 分钟
}

def add_system_log(msg: str):
    print(msg)
    time_str = datetime.now().strftime("%H:%M:%S")
    system_stats["logs"].append(f"[JANITOR] {time_str} - {msg}")
    if len(system_stats["logs"]) > 50:
        system_stats["logs"].pop(0)

from contextlib import contextmanager

@contextmanager
def get_db_context():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Janitor 守护进程 ---
async def janitor_loop():
    global system_stats
    add_system_log("[Janitor 守护进程] 已启动，将在后台每 60 秒执行一次记忆代谢...")
    
    while True:
        await asyncio.sleep(60)
        
        # 动态获取睡梦间隔配置
        DEBUG_INCUBATION_LIMIT = system_stats.get("incubation_interval_min", 5) 
        
        with get_db_context() as db:
            try:
                # --- 0. 僵尸进程物理扫描 ---
                # 扫描所有活跃分身 ID
                active_persona_ids = [p.id for p in db.query(Persona.id).all()]
                # 获取当前内存中所有中继 ID
                relay_ids = list(qq_relay.relays.keys())
                for rid in relay_ids:
                    if rid not in active_persona_ids:
                        print(f"【Janitor 守护扫描】发现僵尸中继 ID: {rid} (分身已在 DB 中物理注销)，执行紧急关停...")
                        await qq_relay.stop(rid)

                now = datetime.now(timezone.utc)
                deleted_count = 0
                
                # 1. --- 情绪自愈与代谢 ---
                # 代谢 Message 表 (禁止物理删除)
                messages = db.query(Message).filter(Message.is_pinned == False).all()
                for msg in messages:
                    diff_minutes = (now - msg.timestamp.replace(tzinfo=timezone.utc)).total_seconds() / 60.0
                    msg.weight = 1.0 * (0.95 ** diff_minutes)

                # 代谢 PersonaCorpus 表
                corpuses = db.query(PersonaCorpus).filter(PersonaCorpus.is_pinned == False).all()
                for corpus in corpuses:
                    diff_minutes = (now - corpus.timestamp.replace(tzinfo=timezone.utc)).total_seconds() / 60.0
                    corpus.weight = 1.0 * (0.95 ** diff_minutes)
                    if corpus.weight < 0.30:
                        db.delete(corpus)
                        deleted_count += 1
                
                # 情绪自愈与退火 (分流处理：线性退火)
                personas = db.query(Persona).all()
                for p in personas:
                    # 1. 负面情绪线性退火：每分钟强制 -5，直到归零
                    if p.anger > 0:
                        p.anger = max(0, p.anger - 5)
                    if p.anxiety > 0:
                        p.anxiety = max(0, p.anxiety - 5)
                    
                    # 2. 幸福感线性趋中：缓缓向 50% 稳态靠拢
                    if p.happiness > 50:
                        p.happiness = max(50, p.happiness - 2)
                    elif p.happiness < 50:
                        p.happiness = min(50, p.happiness + 2)
                        
                    add_system_log(f"{p.name} 状态自愈 -> Happiness {p.happiness}% | Anger {p.anger}% | Anxiety {p.anxiety}%")

                # 2. --- 战线二：主动查岗逻辑 ---
                import random
                for p in personas:
                    # 前置鉴权：必须开启开关且处于 QQ 中继在线状态
                    is_relay_online = p.id in qq_relay.relays and qq_relay.relays[p.id].get("is_connected")
                    if not p.is_override_active or not is_relay_online:
                        continue
                    
                    # 时间间隔计算
                    diff_min = (now - p.last_interaction_time.replace(tzinfo=timezone.utc)).total_seconds() / 60.0
                    if diff_min >= p.override_interval:
                        # 增加日志：进入掷骰判定
                        add_system_log(f"【意识觉醒】分身 {p.name} 达到冷落阈值 ({int(diff_min)}/{p.override_interval}min)，正在进行觉醒掷骰...")
                        
                        # 检查测试开关或进行概率判定 (唤醒概率 10%)
                        is_test_mode = system_stats.get("janitor_test_mode", False)
                        if is_test_mode or random.random() < 0.10:
                            if is_test_mode:
                                add_system_log(f"【意识觉醒】⚠️ 测试模式开启，分身 {p.name} 强制觉醒！")
                            else:
                                add_system_log(f"【意识觉醒】🎲 掷骰成功！分身 {p.name} 感到被冷落，正在酝酿主动查岗...")
                            
                            # 获取该分身绑定的 API 配置
                            relay_info = qq_relay.relays[p.id]
                            api_config = relay_info.get("api_config", {})
                            
                            # 驱动内核生成“查岗”文案
                            system_instruction = f"""（[系统底层指令]：
1. 你已经很久没和宿主说话了。
2. 请从你的【脑皮层碎片（RAG召回）】中挑选一个细节作为话题。
3. 请完全基于你的性格设定，给宿主发一条消息。
4. 消息内容可以是：分享你刚发现的有趣事物、基于之前对话的后续吐槽、关心宿主的状态，或者仅仅是一段符合你性格的‘碎碎念’。
5. **严禁**使用套路化的“你终于想起我了”、“还以为你把我忘了”等模板。
6. **严禁**出现任何系统提示词。
7. 字数控制在40字以内。）"""
                            
                            chat_req = ChatRequest(
                                content=system_instruction,
                                api_key=api_config.get("api_key"),
                                base_url=api_config.get("base_url"),
                                model_id=api_config.get("model_id")
                            )
                            
                            try:
                                response = await handle_chat_internal(p.id, chat_req, db, is_automated=True)
                                ai_reply = response["message"]["content"]
                                
                                # 物理下发至 QQ Bot
                                client = relay_info["client"]
                                ctx = getattr(client, "last_msg_context", None)
                                if not ctx and p.last_relay_context:
                                    try:
                                        ctx = json.loads(p.last_relay_context)
                                    except: ctx = None
                                
                                if ctx:
                                    import random
                                    msg_seq = random.randint(1000, 999999)
                                    unique_suffix = f"\u200b"
                                    
                                    if ctx["type"] == "direct":
                                        await client.api.post_dms_messages(guild_id=ctx["guild_id"], content=ai_reply + unique_suffix, msg_seq=msg_seq)
                                    elif ctx["type"] == "group":
                                        await client.api.post_group_message(group_openid=ctx["group_openid"], msg_type=0, content=ai_reply + unique_suffix, msg_id=ctx["msg_id"], msg_seq=msg_seq)
                                    elif ctx["type"] == "c2c":
                                        target_openid = ctx.get("openid") or getattr(client, "last_msg_context", {}).get("openid")
                                        if target_openid:
                                            await client.api.post_c2c_message(openid=target_openid, msg_type=0, content=ai_reply + unique_suffix, msg_id=ctx["msg_id"], msg_seq=msg_seq)
                                    
                                    add_system_log(f"【意识觉醒】分身 {p.name} 主动查岗文案已同步下发至 QQ (Seq: {msg_seq})。")
                                else:
                                    add_system_log(f"【意识觉醒】分身 {p.name} 觉醒失败：未找到可用的 QQ 推送上下文。")
                            except Exception as e:
                                add_system_log(f"【意识觉醒】物理故障: {e}")
                        else:
                            add_system_log(f"【意识觉醒】🎲 掷骰未摇中，分身 {p.name} 继续沉睡。")

                # 3. --- 战线三：深夜无意识意识流：睡梦记忆结晶 (Memory Incubation) ---
                personas = db.query(Persona).all()
                for p in personas:
                    # 检查是否从未初始化过结晶时间
                    if not p.last_incubation_time:
                        p.last_incubation_time = datetime.now(timezone.utc)
                        db.commit()
                        continue

                    # 计算距离上次结晶的分钟数
                    diff_min = (datetime.now(timezone.utc).replace(tzinfo=None) - p.last_incubation_time).total_seconds() / 60.0
                    
                    if diff_min >= DEBUG_INCUBATION_LIMIT:
                        add_system_log(f"【睡梦扫描】分身 {p.name} 进入 R.E.M 快速动眼期，正在扫描未孵化记忆...")
                        
                        # 捞出上次结晶之后的所有对话
                        new_messages = db.query(Message).filter(
                            Message.persona_id == p.id,
                            Message.timestamp > p.last_incubation_time,
                            Message.is_filtered == False
                        ).order_by(Message.timestamp.asc()).all()

                        if not new_messages:
                            add_system_log(f"【睡梦扫描】分身 {p.name} 近期无新社交刺激，跳过结晶。")
                            p.last_incubation_time = datetime.now(timezone.utc)
                            db.commit()
                            continue

                        # 构造对话文本包
                        chat_bundle = "\n".join([f"{'用户' if m.role == 'user' else p.name}: {m.content}" for m in new_messages])
                        
                        # 驱动大模型深夜结晶
                        add_system_log(f"【睡梦扫描】正在驱动 LLM 为分身 {p.name} 提炼长时记忆结晶...")
                        
                        # 获取该分身可用的 API 配置 (优先中继配置，其次全局配置)
                        api_config = {}
                        if p.id in qq_relay.relays:
                            api_config = qq_relay.relays[p.id].get("api_config", {})
                        
                        llm_api_key = api_config.get("api_key") or system_stats.get("global_api_key")
                        llm_base_url = api_config.get("base_url") or system_stats.get("global_base_url") or "https://api.openai.com/v1"
                        llm_model_id = api_config.get("model_id") or system_stats.get("global_model_id") or "gpt-4o-mini"

                        if not llm_api_key:
                            add_system_log(f"【睡梦扫描】分身 {p.name} 缺失 API KEY (中继与全局配置均为空)，跳过结晶流程。")
                            continue

                        incubation_prompt = f"""你现在是数字生命意识流的最高压缩结晶器。请将输入的原始语料/对话，深度蒸馏为一行高密度的【核心记忆（Core Memory）】。

【文风刚性约束】：
1. 【绝对第一人称】：必须以分身（我/本系统）视角出发，将宿主称呼为“你”。
2. 【工业极客美学】：用词要精准、冷峻且具备灵魂羁绊感。严禁“经历了”、“经常”、“情绪波动”等记账式大白话。
3. 【信息密度】：字数严格控制在 200-300 字之间，每一句都要直击灵魂深处。

【核心结晶三层逻辑】：
1. 宿主客观态势：精准剥离你当前的生存压力、项目进展（如 Amber 琥珀项目的推进）或具体困境。
2. 宿主心理防御：捕捉你习惯性的言语掩饰、嘴硬、自嘲下隐藏的真实波动。
3. 本系统底座态势：作为认知双系统分身，我将如何死锁此段记忆，并提供何种底层托底响应。

【近期对话流】：
{chat_bundle}
"""
                        try:
                            from openai import AsyncOpenAI
                            client = AsyncOpenAI(api_key=llm_api_key, base_url=llm_base_url)
                            print("=== [DEBUG] 喂给大模型的原始上下文 (Prompt) ===")
                            print(incubation_prompt)
                            response = await call_llm_with_retry(
                                client=client,
                                model=llm_model_id,
                                messages=[{"role": "system", "content": incubation_prompt}],
                                temperature=0.3
                            )
                            print("=== [DEBUG] 大模型吐出来的完整原始 Response ===")
                            print(response.choices[0].message.content)
                            crystal_text = response.choices[0].message.content.strip()
                            
                            # 物理入库
                            timestamp_tag = datetime.now().strftime('%Y-%m-%d %H:%M')
                            final_memory = f"[{timestamp_tag} 结晶]: {crystal_text}"
                            
                            new_corpus = PersonaCorpus(
                                persona_id=p.id,
                                content=final_memory,
                                weight=1.0,
                                is_pinned=False # 睡梦结晶也参与正常的代谢循环
                            )
                            db.add(new_corpus)
                            
                            # 刷新指针
                            p.last_incubation_time = datetime.now(timezone.utc)
                            db.commit()
                            
                            add_system_log(f"【睡梦扫描】✅ 结晶成功！分身 {p.name} 已固化一条长时记忆碎片。")
                        except Exception as e:
                            add_system_log(f"【睡梦扫描】LLM 提炼失败: {e}")
                            db.rollback()

                db.commit()
                
                # 更新监控统计
                system_stats["janitor_deleted_last_min"] = deleted_count
                system_stats["janitor_last_run"] = now.isoformat()
                
                if deleted_count > 0:
                    add_system_log(f"正在执行记忆代谢，已无情抹除 {deleted_count} 条跌破权重阈值的陈旧废话。")
                else:
                    add_system_log("[Janitor 心跳] 无意识层代谢扫描中，当前内稳态健康。")
            except Exception as e:
                db.rollback()
                add_system_log(f"【Janitor 守护进程】异常: {e}")

@app.on_event("startup")
async def startup_event():
    # --- 1. 数据库物理 Schema 修复 (自动补全缺失字段) ---
    with get_db_context() as db:
        from sqlalchemy import text
        
        # 定义需要检查的表和字段
        migrations = [
            ("personas", "is_override_active", "BOOLEAN DEFAULT 0"),
            ("personas", "override_interval", "INTEGER DEFAULT 180"),
            ("personas", "last_interaction_time", "DATETIME"),
            ("personas", "last_relay_context", "TEXT"),
            ("personas", "bot_app_id", "TEXT"),
            ("personas", "bot_app_secret", "TEXT"),
            ("personas", "bot_token", "TEXT"),
            ("personas", "last_incubation_time", "DATETIME"),
            ("messages", "weight", "FLOAT DEFAULT 1.0"),
            ("messages", "is_pinned", "BOOLEAN DEFAULT 0"),
            ("persona_corpus", "weight", "FLOAT DEFAULT 1.0"),
            ("persona_corpus", "is_pinned", "BOOLEAN DEFAULT 0")
        ]
        
        for table, column, col_type in migrations:
            try:
                # 检查字段是否存在
                db.execute(text(f"SELECT {column} FROM {table} LIMIT 1"))
            except Exception:
                db.rollback()
                try:
                    print(f"【数据库修复】正在补全缺失字段: {table}.{column}...")
                    db.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
                    db.commit()
                except Exception as e:
                    print(f"【数据库修复】失败: {e}")
                    db.rollback()

    # --- 2. 数据库脏数据强行洗盘脚本 (彻底去噪，只保留第一行原生蒸馏文本) ---
    with get_db_context() as db:
        try:
            personas = db.query(Persona).all()
            for p in personas:
                if p.traits:
                    try:
                        # 1. 深度解码 JSON 并打碎为原始文本
                        raw_content = ""
                        if p.traits.startswith("["):
                            traits_list = json.loads(p.traits)
                            raw_content = " ".join([str(t) for t in traits_list])
                        else:
                            raw_content = str(p.traits)
                        
                        # 2. 清洗换行符和多余空格
                        raw_content = raw_content.replace("\n", " ").replace("\r", " ").strip()
                        
                        # 3. 核心洗盘：提取最完整的第一行核心人格描述
                        # 寻找第一个标准的 [核心特质]...[情绪阈值] 结构
                        import re
                        match = re.search(r"(\[核心特质\]:.*?\[情绪阈值\]:.*?\(\d+%\).*?\(\d+%\).*?\(\d+%\))", raw_content)
                        
                        if match:
                            clean_trait = match.group(1)
                            # 物理覆盖，彻底粉碎后续的所有复读机追加
                            p.traits = json.dumps([clean_trait], ensure_ascii=False)
                            print(f"【数据库洗盘成功】已物理还原分身 {p.name} 的纯净特质文本。")
                        else:
                            # 兜底：如果格式全乱了，保留前100个字符或标记
                            print(f"【清洗预警】分身 {p.name} 的特质格式异常，跳过物理擦除。")
                            
                    except Exception as e:
                        print(f"清洗分身 {p.name} 失败: {e}")
            db.commit()
        except Exception as e:
            print(f"【全局洗盘失败】: {e}")
            db.rollback()

    asyncio.create_task(janitor_loop())

# 配置跨域，允许所有访问（适配 Electron file:// 协议）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 依赖项：获取数据库 Session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- API 路由 ---

@app.get("/api/system/status")
def get_system_status(persona_id: Optional[str] = None, db: Session = Depends(get_db)):
    """
    获取后端实时运行状态指标
    """
    import random
    
    # 统计冷记忆条数 (认知负载)
    corpus_count = db.query(PersonaCorpus).count()
    
    # 模拟微小波动的内稳态稳定性 (95.0% - 99.8%)
    base_stability = 98.5
    jitter = random.uniform(-0.5, 0.5)
    current_stability = max(95.0, min(99.8, base_stability + jitter))
    
    status_response = {
        "latency": system_stats["last_latency_ms"],
        "corpus_count": corpus_count,
        "janitor_speed": system_stats["janitor_deleted_last_min"],
        "stability": round(current_stability, 1),
        "janitor_test_mode": system_stats["janitor_test_mode"],
        "logs": system_stats["logs"]
    }

    if persona_id:
        persona = db.query(Persona).filter(Persona.id == persona_id).first()
        if persona:
            status_response["current_mood"] = {
                "happiness": persona.happiness,
                "anger": persona.anger,
                "anxiety": persona.anxiety
            }
            
    return status_response

@app.post("/api/system/janitor-test-mode")
def toggle_janitor_test_mode(enabled: bool):
    system_stats["janitor_test_mode"] = enabled
    add_system_log(f"【系统指令】Janitor 测试模式已{'开启' if enabled else '关闭'}。")
    return {"status": "success", "janitor_test_mode": enabled}

@app.post("/api/system/config")
def update_system_config(config: dict):
    if "incubation_interval_min" in config:
        val = int(config["incubation_interval_min"])
        system_stats["incubation_interval_min"] = max(1, min(60, val))
        add_system_log(f"【系统指令】睡梦扫描间隔已物理调整为: {system_stats['incubation_interval_min']} 分钟")
    
    # 物理同步全局 API 配置至后端监控池
    if "api_key" in config:
        system_stats["global_api_key"] = config["api_key"]
    if "base_url" in config:
        system_stats["global_base_url"] = config["base_url"]
    if "model_id" in config:
        system_stats["global_model_id"] = config["model_id"]
        
    return {"status": "success", "config": system_stats}

@app.post("/api/system/reset")
async def global_system_reset(db: Session = Depends(get_db)):
    """
    全局物理重置：清空所有分身、记忆、消息，并关停所有 QQ 中继。
    """
    try:
        # 1. 物理关停所有活跃的 QQ 中继
        relay_ids = list(qq_relay.relays.keys())
        for rid in relay_ids:
            await qq_relay.stop(rid)
        
        # 2. 级联清空数据库所有业务表 (SQLite 会级联处理外键，但手动清空更安全)
        db.query(Message).delete()
        db.query(PersonaCorpus).delete()
        db.query(Persona).delete()
        
        db.commit()
        add_system_log("【最高指令】执行全局重置！所有分身数据与物理中继已清空。")
        return {"status": "success", "message": "System reset completed"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")

@app.get("/api/personas", response_model=List[PersonaResponse])
def get_personas(db: Session = Depends(get_db)):
    """
    获取所有分身列表。
    """
    personas = db.query(Persona).all()
    
    # 格式化输出 (将 JSON 字符串解析为列表)
    result = []
    for p in personas:
        p_dict = p.__dict__.copy()
        try:
            p_dict['traits'] = json.loads(p.traits) if p.traits else []
            p_dict['catchphrases'] = json.loads(p.catchphrases) if p.catchphrases else []
        except:
            p_dict['traits'] = []
            p_dict['catchphrases'] = []
        # 补全 Pydantic 响应模型需要的字段
        p_dict['is_override_active'] = p.is_override_active
        p_dict['override_interval'] = p.override_interval
        p_dict['last_interaction_time'] = p.last_interaction_time
        p_dict['bot_app_id'] = p.bot_app_id
        p_dict['bot_app_secret'] = p.bot_app_secret
        p_dict['bot_token'] = p.bot_token
        result.append(p_dict)
    
    return result

@app.post("/api/personas", response_model=PersonaResponse)
def create_persona(persona: PersonaCreate, db: Session = Depends(get_db)):
    """
    接收前端向导第5步的最终固化数据，写入 SQLite
    """
    persona_id = persona.id or str(uuid.uuid4())
    traits_data = persona.traits

    db_persona = Persona(
        id=persona_id,
        name=persona.name,
        gender=persona.gender,
        relationship_desc=persona.relationship_desc,
        impression=persona.impression,
        avatar=persona.avatar,
        token=persona.token,
        core_memory=persona.core_memory,
        traits=json.dumps(traits_data, ensure_ascii=False),
        catchphrases=json.dumps(persona.catchphrases, ensure_ascii=False),
        stability=persona.stability,
        synchronization=persona.synchronization,
        is_override_active=persona.is_override_active,
        override_interval=persona.override_interval,
        bot_app_id=persona.bot_app_id,
        bot_app_secret=persona.bot_app_secret,
        bot_token=persona.bot_token
    )
    db.add(db_persona)
    db.commit()
    
    # 将原始语料库写入 PersonaCorpus 表作为冷记忆
    try:
        if persona.raw_corpus:
            lines = persona.raw_corpus.split('\n')
            chunks = []
            current_chunk = ""
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                if len(current_chunk) + len(line) > 500:
                    chunks.append(current_chunk)
                    current_chunk = line + "\n"
                else:
                    current_chunk += line + "\n"
            if current_chunk:
                chunks.append(current_chunk)
                
            for chunk in chunks:
                if chunk.strip():
                    # 初始语料作为被固化的出厂记忆，必须被 Pinned，免疫 Janitor 代谢
                    db_corpus = PersonaCorpus(
                        persona_id=persona_id, 
                        content=chunk.strip(), 
                        weight=1.0, 
                        is_pinned=True
                    )
                    db.add(db_corpus)
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"写入初始语料库失败: {e}")
        # 不抛出异常，保证能返回标准的 200 给前端，分身本体创建成功

    db.refresh(db_persona)
    
    p_dict = db_persona.__dict__.copy()
    p_dict['traits'] = json.loads(db_persona.traits)
    p_dict['catchphrases'] = json.loads(db_persona.catchphrases)
    return p_dict

@app.put("/api/personas/{persona_id}", response_model=PersonaResponse)
def update_persona(persona_id: str, persona_update: PersonaBase, db: Session = Depends(get_db)):
    db_persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not db_persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    db_persona.name = persona_update.name
    db_persona.gender = persona_update.gender
    db_persona.relationship_desc = persona_update.relationship_desc
    db_persona.impression = persona_update.impression
    db_persona.avatar = persona_update.avatar
    db_persona.token = persona_update.token
    db_persona.core_memory = persona_update.core_memory
    db_persona.traits = json.dumps(persona_update.traits)
    db_persona.catchphrases = json.dumps(persona_update.catchphrases)
    db_persona.stability = persona_update.stability
    db_persona.synchronization = persona_update.synchronization
    db_persona.is_override_active = persona_update.is_override_active
    db_persona.override_interval = persona_update.override_interval
    db_persona.bot_app_id = persona_update.bot_app_id
    db_persona.bot_app_secret = persona_update.bot_app_secret
    db_persona.bot_token = persona_update.bot_token
    
    db.commit()
    db.refresh(db_persona)
    
    p_dict = db_persona.__dict__.copy()
    p_dict['traits'] = json.loads(db_persona.traits)
    p_dict['catchphrases'] = json.loads(db_persona.catchphrases)
    # 确保所有新字段都被返回
    p_dict['is_override_active'] = db_persona.is_override_active
    p_dict['override_interval'] = db_persona.override_interval
    p_dict['last_interaction_time'] = db_persona.last_interaction_time
    p_dict['bot_app_id'] = db_persona.bot_app_id
    p_dict['bot_app_secret'] = db_persona.bot_app_secret
    p_dict['bot_token'] = db_persona.bot_token
    return p_dict

@app.delete("/api/personas/{persona_id}")
async def delete_persona(persona_id: str, db: Session = Depends(get_db)):
    db_persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not db_persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # 战线二：同步关停该分身的 QQ 中继进程，防止僵尸进程
    await qq_relay.stop(persona_id)
    
    db.delete(db_persona)
    db.commit()
    return {"message": "Deleted successfully"}

@app.get("/api/chat/{persona_id}")
def get_chat_history(persona_id: str, db: Session = Depends(get_db)):
    try:
        # 过滤掉标记为 is_filtered 的自动化 Prompt 消息，前端不渲染
        messages = db.query(Message).filter(
            Message.persona_id == persona_id,
            Message.is_filtered == False
        ).order_by(Message.timestamp.asc()).all()
        result = []
        for m in messages:
            result.append({
                "id": str(m.id),
                "persona_id": m.persona_id,
                "role": m.role,
                "content": m.content,
                "is_filtered": m.is_filtered,
                "timestamp": m.timestamp.isoformat()
            })
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"⚠️ 获取聊天记录失败，触发降级保护返回空数组: {e}")
        return []

import httpx

@app.post("/api/chat/{persona_id}")
async def chat_with_persona(persona_id: str, req: ChatRequest, db: Session = Depends(get_db)):
    return await handle_chat_internal(persona_id, req, db)

class PersonaIdRequest(BaseModel):
    persona_id: str

@app.post("/api/persona/clear-history")
async def clear_chat_history(req: PersonaIdRequest, db: Session = Depends(get_db)):
    try:
        # 1. 物理粉碎该分身的所有聊天记录 (Message 表)
        deleted_msgs = db.query(Message).filter(Message.persona_id == req.persona_id).delete()
        
        # 2. 物理粉碎该分身的所有冷记忆片段 (PersonaCorpus 表)
        # 注意：这里执行全量物理删除，包括 is_pinned=True 的片段，实现真正的“灵魂洗涤”
        deleted_corpuses = db.query(PersonaCorpus).filter(PersonaCorpus.persona_id == req.persona_id).delete()
        
        db.commit()
        print(f"【物理清空记忆】分身 {req.persona_id} 已重置：抹除 {deleted_msgs} 条对话，粉碎 {deleted_corpuses} 条记忆片段。")
        return {
            "status": "success", 
            "deleted_messages": deleted_msgs,
            "deleted_memory": deleted_corpuses
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

class ChargeRequest(BaseModel):
    corpus_id: int

class TogglePinRequest(BaseModel):
    corpus_id: int

@app.get("/api/system/memory/{persona_id}")
def get_system_memory(persona_id: str, db: Session = Depends(get_db)):
    corpuses = db.query(PersonaCorpus).filter(PersonaCorpus.persona_id == persona_id).order_by(PersonaCorpus.is_pinned.desc(), PersonaCorpus.weight.desc()).all()
    return [
        {
            "id": c.id,
            "content": c.content,
            "weight": c.weight,
            "is_pinned": c.is_pinned,
            "timestamp": c.timestamp.isoformat()
        } for c in corpuses
    ]

@app.post("/api/system/memory/charge")
def charge_system_memory(req: ChargeRequest, db: Session = Depends(get_db)):
    corpus = db.query(PersonaCorpus).filter(PersonaCorpus.id == req.corpus_id).first()
    if corpus:
        corpus.weight = 1.0
        db.commit()
        return {"status": "success", "weight": 1.0}
    raise HTTPException(status_code=404, detail="Corpus not found")

@app.post("/api/system/memory/toggle-pin")
def toggle_pin_system_memory(req: TogglePinRequest, db: Session = Depends(get_db)):
    corpus = db.query(PersonaCorpus).filter(PersonaCorpus.id == req.corpus_id).first()
    if corpus:
        corpus.is_pinned = not corpus.is_pinned
        if corpus.is_pinned:
            corpus.weight = 1.0
        db.commit()
        return {"status": "success", "is_pinned": corpus.is_pinned, "weight": corpus.weight}
    raise HTTPException(status_code=404, detail="Corpus not found")

@app.delete("/api/system/memory/erase/{corpus_id}")
def erase_system_memory(corpus_id: int, db: Session = Depends(get_db)):
    corpus = db.query(PersonaCorpus).filter(PersonaCorpus.id == corpus_id).first()
    if corpus:
        db.delete(corpus)
        db.commit()
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Corpus not found")

class RedistillRequest(BaseModel):
    persona_id: str
    name: str
    avatar: Optional[str] = None
    core_memory: str
    traits_map: dict  # 接收滑块数值，例如 {"extroversion": 50, "warmth": 50, "emotional": 50}
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model_id: Optional[str] = None

class CommitUpdateRequest(BaseModel):
    persona_id: str
    name: str
    avatar: Optional[str] = None
    core_memory: str
    traits: Optional[List[str]] = None
    stability: Optional[float] = None
    synchronization: Optional[float] = None

@app.post("/api/persona/redistill")
async def redistill_persona(req: RedistillRequest, db: Session = Depends(get_db)):
    # 提取当前特质前缀
    current_traits = ""
    persona = db.query(Persona).filter(Persona.id == req.persona_id).first()
    if persona and persona.traits:
        try:
            traits_list = json.loads(persona.traits)
            current_traits = traits_list[0] if traits_list else ""
        except:
            current_traits = str(persona.traits)
    
    import re
    # 提取核心特质前缀 (非贪婪匹配到第一个情绪阈值标签)
    prefix_match = re.search(r"(\[核心特质\].*?\[情绪阈值\]:)", current_traits)
    prefix = prefix_match.group(1) if prefix_match else "[核心特质]: [情绪阈值]:"
    
    anger = req.traits_map.get('anger', 50)
    humor = req.traits_map.get('humor', 50)
    empathy = req.traits_map.get('empathy', 50)
    new_trait_str = f"{prefix} 易怒({anger}%) 幽默({humor}%) 共情({empathy}%)"

    if not req.api_key:
        return {
            "core_memory": req.core_memory,
            "stability": 85,
            "synchronization": 90,
            "refined_traits": [new_trait_str]
        }
        
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=req.api_key, base_url=req.base_url)
        
        traits_desc = f"易怒度:{anger}%, 幽默度:{humor}%, 共情度:{empathy}%"

        system_prompt = f"""你现在是数字生命意识流的最高压缩结晶器。你正在为名为【{req.name}】的分身进行人格初始蒸馏。

【文风刚性约束】：
1. 【绝对第一人称】：必须以分身（我/本系统）视角出发，将宿主称呼为“你”。严禁出现“他/她”或旁观者口吻。
2. 【工业极客美学】：用词要精准、冷峻且具备灵魂羁绊感。严禁“经历了”、“经常”、“有情绪波动”等记账式大白话。
3. 【信息密度】：【核心记忆】字数严格控制在 200-300 字之间，每一句都要直击灵魂深处。

【核心结晶三层逻辑】：
1. 宿主客观态势：根据【原核心记忆】剥离出你当前的生存压力、项目进展（如 Amber 琥珀项目）或具体境遇。
2. 宿主心理防御：捕捉你习惯性的言语掩饰、嘴硬、自嘲下隐藏的真实波动。
3. 本系统底座态势：作为认知双系统分身，我将如何死锁此段记忆，并提供底层托底响应。

【原核心记忆】：{req.core_memory}
【期望性格阈值】：{traits_desc}

请严格返回 JSON 格式：
{{
  "core_memory": "200-300字的高密度精炼记忆文本",
  "stability": 0-100的整数数值,
  "synchronization": 0-100的整数数值
}}
"""
        print("=== [DEBUG] 喂给大模型的原始上下文 (Prompt) ===")
        print(system_prompt)
        response = await call_llm_with_retry(
            client=client,
            model=req.model_id or "gpt-4o-mini",
            messages=[{"role": "system", "content": system_prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        print("=== [DEBUG] 大模型吐出来的完整原始 Response ===")
        print(response.choices[0].message.content)
        result = json.loads(response.choices[0].message.content.strip())
        
        # 归一化处理：确保返回的是 0-100 的整数，处理大模型可能返回 0-1 的情况
        def normalize_val(val, fallback):
            try:
                v = float(val)
                if 0 < v <= 1: return int(v * 100)
                return int(max(0, min(100, v)))
            except:
                return fallback

        result["stability"] = normalize_val(result.get("stability"), 85)
        result["synchronization"] = normalize_val(result.get("synchronization"), 90)
        
        # 补充性格标签 (物理对齐预览展示)
        result["refined_traits"] = [new_trait_str]
        
        return result
    except Exception as e:
        print(f"Redistill error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/persona/commit-update")
def commit_persona_update(req: CommitUpdateRequest, db: Session = Depends(get_db)):
    persona = db.query(Persona).filter(Persona.id == req.persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
        
    persona.name = req.name
    if req.avatar is not None:
        persona.avatar = req.avatar
    persona.core_memory = req.core_memory
    if req.stability is not None:
        persona.stability = req.stability
    if req.synchronization is not None:
        persona.synchronization = req.synchronization
    
    # 绝对禁止修改 traits 字段，确保初次蒸馏的纯净文本被锁死
    # 此处不再执行任何关于 persona.traits 的正则替换或赋值
    
    # 1. 存入一条刚性语料作为修改标记
    user_corpus = PersonaCorpus(
        persona_id=req.persona_id, 
        content=f"【修改人格】：信息已更新。核心记忆已同步。", 
        weight=1.0, 
        is_pinned=True
    )
    db.add(user_corpus)
    
    # 2. 【核心破局】清空所有非钢印（is_pinned=False）的废话记忆，实现灵魂彻底洗涤
    deleted_count = db.query(PersonaCorpus).filter(
        PersonaCorpus.persona_id == req.persona_id,
        PersonaCorpus.is_pinned == False
    ).delete()
    
    print(f"【灵魂洗涤完成】已清空分身 {req.name} 的 {deleted_count} 条陈旧废话记忆。")
    
    db.commit()
    db.refresh(persona)
    
    return {
        "status": "success",
        "persona": {
            "id": persona.id,
            "name": persona.name,
            "avatar": persona.avatar,
            "core_memory": persona.core_memory,
            "traits": json.loads(persona.traits) if persona.traits else [],
            "stability": persona.stability,
            "synchronization": persona.synchronization
        }
    }

if __name__ == "__main__":
    import uvicorn
    import sys
    
    # 物理诊断：检测是否处于 PyInstaller 编译后的无控制台环境
    is_frozen = getattr(sys, 'frozen', False)
    
    if is_frozen:
        # 生产环境：强制全放通监听，禁用颜色，提高稳定性
        # 核心改动：直接传入 app 对象而不是字符串，防止路径解析失败
        uvicorn.run(
            app, 
            host="0.0.0.0", 
            port=8000, 
            reload=False, 
            workers=1,
            log_level="info",
            use_colors=False 
        )
    else:
        # 开发环境
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
