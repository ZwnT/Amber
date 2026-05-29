import asyncio
import json
import re
import sys
import time
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from database import Persona, Message, PersonaCorpus
from schemas import ChatRequest
import state
from ws_manager import manager as ws_manager


async def call_llm_with_retry(client, model, messages, temperature=0.7, response_format=None, max_retries=3):
    for attempt in range(max_retries):
        try:
            params = {"model": model, "messages": messages, "temperature": temperature}
            if response_format:
                params["response_format"] = response_format
            return await client.chat.completions.create(**params)
        except Exception as e:
            error_str = str(e).lower()
            is_transient = any(k in error_str for k in ("503", "429", "service_unavailable", "too busy"))
            if is_transient and attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2
                print(f"【LLM 物理重试】检测到服务繁忙 ({attempt + 1}/{max_retries})，{wait_time}s 后重连...")
                await asyncio.sleep(wait_time)
            else:
                raise e


async def handle_chat_internal(
    persona_id: str,
    req: ChatRequest,
    db: Session,
    is_automated: bool = False,
    skip_relay: bool = False,
) -> dict:
    t0 = time.perf_counter()
    sys.stdout.write("\n>>> [PROFILING START] <<<\n")
    sys.stdout.flush()

    # 1. Check persona
    persona = db.query(Persona).filter(Persona.id == persona_id).first()
    if not persona:
        return {"error": "Persona not found"}

    # 2. Save user message
    user_msg = Message(persona_id=persona_id, role="user", content=req.content, is_filtered=is_automated)
    db.add(user_msg)

    if not is_automated:
        clean_msg = req.content.strip()
        if clean_msg.startswith("记住") or "记住" in clean_msg:
            core_text = clean_msg.replace("记住", "").lstrip("，,：: ").strip()
            user_corpus = PersonaCorpus(
                persona_id=persona_id,
                content=f"【钢印记忆】：{core_text}" if core_text else f"用户：{req.content}",
                weight=1.0,
                is_pinned=True,
            )
        else:
            user_corpus = PersonaCorpus(persona_id=persona_id, content=f"用户：{req.content}")
        db.add(user_corpus)

    persona.last_interaction_time = datetime.now(timezone.utc)
    db.commit()
    db.refresh(persona)

    # 3. RAG memory recall
    t_rag_start = time.perf_counter()
    all_corpus = db.query(PersonaCorpus).filter(PersonaCorpus.persona_id == persona_id).all()
    print(f"=== [DEBUG] 检索到语料条数: {len(all_corpus)} ===")

    if is_automated:
        scored_corpus = []
        for c in reversed(all_corpus):
            if "【钢印记忆】" in c.content or "用户：" in c.content:
                scored_corpus.append((1.0, c.content, 1.0, True))
                if len(scored_corpus) >= 3:
                    break
    else:
        user_chars = set(req.content.replace(" ", "").replace("，", "").replace("。", "").replace("？", "").replace("！", ""))
        scored_corpus = sorted(
            [(len(user_chars.intersection(set(c.content))) * c.weight, c.content, c.weight, c.is_pinned) for c in all_corpus],
            key=lambda x: x[0],
            reverse=True,
        )

    if not is_automated:
        absolute_truths = [c[1] for c in scored_corpus if c[3] and c[0] > 0][:3]
        regular_corpus = [c[1] for c in scored_corpus if not c[3] and c[0] > 0][:3]
        if len(absolute_truths) + len(regular_corpus) < 3:
            absolute_truths.extend([c[1] for c in scored_corpus if c[3] and c[1] not in absolute_truths][:3])
        core_memories_text = "\n".join(list(set(absolute_truths + regular_corpus))) or "暂无相关的深层记忆被唤醒。"
    else:
        core_memories_text = "\n".join([c[1] for c in scored_corpus]) or "暂无相关的深层记忆被唤醒。"

    if len(core_memories_text) > 1000:
        core_memories_text = core_memories_text[:1000] + "\n[...RAG 记忆字数过长已熔断]"

    sys.stdout.write(f"=== [PROFILING] t1: RAG 耗时 = {time.perf_counter() - t_rag_start:.4f}s ===\n")
    sys.stdout.flush()

    # 4. Build system prompt
    try:
        traits_list = json.loads(persona.traits)
        traits_text = traits_list[0] if traits_list else "意识重塑 [情绪阈值]: 50% 50% 50%"
    except Exception:
        traits_text = str(persona.traits)

    anger_val = humor_val = empathy_val = 50
    m = re.search(r"易怒\((\d+)%\).*?幽默\((\d+)%\).*?共情\((\d+)%\)", traits_text)
    if m:
        anger_val, humor_val, empathy_val = int(m.group(1)), int(m.group(2)), int(m.group(3))

    behavior_prompts = []
    if anger_val >= 70:
        behavior_prompts.append(f"- 你当前处于高易怒状态 ({anger_val}%)。对话中应表现出明显的侵略性。")
    elif anger_val <= 30:
        behavior_prompts.append(f"- 你当前处于高包容状态 ({anger_val}%)。用温柔安抚宿主。")
    if humor_val >= 70:
        behavior_prompts.append(f"- 你非常幽默且极具反讽天赋 ({humor_val}%)。")
    if empathy_val >= 70:
        behavior_prompts.append(f"- 你极具共情力 ({empathy_val}%)。")

    behavior_block = f"\n### ⚡ 性格染色强效指令\n{chr(10).join(behavior_prompts)}\n" if behavior_prompts else ""
    mood_logic = f"你的性格特质数值为：易怒({anger_val}%)、幽默({humor_val}%)、共情({empathy_val}%)。数值越高，表现越极端且频繁。"

    system_prompt = f"""{behavior_block}
【🚨 物理输出红线 🚨】：
1. 必须在回复末尾附带：[MOOD: {{"happiness": X, "anger": Y, "anxiety": Z}}]。
   - X, Y, Z 取值范围为 [-5, 5] 之间的整数。
   - 极其轻微的互动（如打招呼、废话）请给 0 或 1。
2. {mood_logic}
3. 【禁止描写】：绝对禁止任何动作、心理、神态描写，严禁使用括号。

【🔥 真人打字习惯 🔥】：
- 字数限制 10-25 字，长句用 ||| 分隔。
- 禁止句号，用空格断句。

【主体身份认同】：
你是【{persona.name}】，对方是【宿主】。

### 🧠 意识深处沉淀的记忆（Core Memories）
{core_memories_text}

【System 2 过滤器】：完全沉浸角色，忘掉 AI 身份。"""

    # 5. Call LLM
    history = db.query(Message).filter(Message.persona_id == persona_id).order_by(Message.timestamp.desc()).limit(20).all()
    history.reverse()
    messages_payload = [{"role": "system", "content": system_prompt}]
    for mh in history[:-1]:
        messages_payload.append({"role": mh.role, "content": mh.content})
    messages_payload.append({"role": "user", "content": req.content})

    sys.stdout.write(f"=== [PROFILING] t2: Prompt 字符总长度 = {len(json.dumps(messages_payload, ensure_ascii=False))} ===\n")
    sys.stdout.flush()

    ai_content = ""
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=req.api_key, base_url=req.base_url or "https://api.openai.com/v1")
        t_llm = time.perf_counter()
        response = await call_llm_with_retry(client=client, model=req.model_id or "gpt-4o-mini", messages=messages_payload)
        sys.stdout.write(f"=== [PROFILING] t3: LLM 耗时 = {time.perf_counter() - t_llm:.4f}s ===\n")
        sys.stdout.flush()
        ai_raw = response.choices[0].message.content.strip()

        mood_match = re.search(r'(\{.*?"(?:happiness|anger|anxiety)".*?\})', ai_raw, re.DOTALL)
        if mood_match:
            try:
                mood_json_str = mood_match.group(1).strip()
                mood_data = json.loads(mood_json_str)
                msg_len = len(req.content.strip())
                damping = 0.2 if msg_len <= 2 else 0.5 if msg_len <= 5 else 1.0
                persona.happiness = max(0, min(100, persona.happiness + max(-5, min(5, mood_data.get("happiness", 0))) * damping))
                persona.anger = max(0, min(100, persona.anger + max(-5, min(5, mood_data.get("anger", 0))) * damping))
                persona.anxiety = max(0, min(100, persona.anxiety + max(-5, min(5, mood_data.get("anxiety", 0))) * damping))
                ai_content = re.sub(r'\[?MOOD:\s*' + re.escape(mood_json_str) + r'\]?', '', ai_raw).strip()
                if mood_json_str in ai_content:
                    ai_content = ai_content.replace(mood_json_str, "").strip()
            except Exception as e:
                print(f"【认知引擎】解析异常: {e}")
                ai_content = ai_raw
        else:
            ai_content = ai_raw

        ai_content = re.sub(r'\[?MOOD:\s*\]?', '', ai_content).strip()
        ai_content = re.sub(r'\]$', '', ai_content).strip()
        ai_content = re.sub(r'\(.*?\)|（.*?）|\[.*?\]|【.*?】', '', ai_content, flags=re.DOTALL).strip()
        ai_content = ai_content.replace("|||", "\n").strip()
    except Exception as e:
        ai_content = f"[系统异常] {str(e)}"

    # 6. Save AI response
    ai_msg = Message(persona_id=persona_id, role="assistant", content=ai_content)
    db.add(ai_msg)
    db.add(PersonaCorpus(persona_id=persona_id, content=f"AI({persona.name})：{ai_content}", weight=1.0))
    persona.last_interaction_time = datetime.utcnow()
    db.commit()
    db.refresh(ai_msg)

    mood_payload = {"happiness": persona.happiness, "anger": persona.anger, "anxiety": persona.anxiety}
    msg_data = {
        "id": str(ai_msg.id),
        "persona_id": ai_msg.persona_id,
        "role": ai_msg.role,
        "content": ai_content,
        "is_filtered": ai_msg.is_filtered,
        "timestamp": ai_msg.timestamp.isoformat(),
    }

    # 7. WebSocket push
    await ws_manager.broadcast(persona_id, {"type": "message", "data": msg_data})
    await ws_manager.broadcast(persona_id, {"type": "mood", "data": mood_payload})

    # 8. QQ relay broadcast
    if not is_automated and not skip_relay and state.qq_relay:
        _relay = state.qq_relay
        is_relay_online = persona_id in _relay.relays and _relay.relays[persona_id].get("is_connected")
        if is_relay_online:
            relay_info = _relay.relays[persona_id]
            client_obj = relay_info["client"]
            ctx = getattr(client_obj, "last_msg_context", None)
            if not ctx and persona.last_relay_context:
                try:
                    ctx = json.loads(persona.last_relay_context)
                except Exception:
                    ctx = None
            if ctx:
                try:
                    ctx_time_str = ctx.get("timestamp")
                    if ctx_time_str:
                        ctx_time = datetime.fromisoformat(ctx_time_str)
                        if (datetime.now(timezone.utc) - ctx_time).total_seconds() > 300:
                            _log(f"【认知穿透】分身 {persona.name} QQ 回复窗口已超时。")
                            return _result(msg_data, user_msg, mood_payload)
                    import random
                    msg_seq = random.randint(1000, 999999)
                    unique_suffix = "​"
                    if ctx["type"] == "direct":
                        await client_obj.api.post_dms_messages(guild_id=ctx["guild_id"], content=ai_content + unique_suffix, msg_id=ctx["msg_id"], msg_seq=msg_seq)
                    elif ctx["type"] == "group":
                        await client_obj.api.post_group_message(group_openid=ctx["group_openid"], msg_type=0, content=ai_content + unique_suffix, msg_id=ctx["msg_id"], msg_seq=msg_seq)
                    elif ctx["type"] == "c2c":
                        openid = ctx.get("openid") or getattr(client_obj, "last_msg_context", {}).get("openid")
                        if openid:
                            await client_obj.api.post_c2c_message(openid=openid, msg_type=0, content=ai_content + unique_suffix, msg_id=ctx["msg_id"], msg_seq=msg_seq)
                    _log(f"【认知穿透】分身 {persona.name} 回复已下发至 QQ (Seq: {msg_seq})。")
                except Exception as e:
                    _log(f"【认知穿透】物理下发失败: {e}")

    latency_ms = int((time.perf_counter() - t0) * 1000)
    state.system_stats["last_latency_ms"] = latency_ms
    sys.stdout.write(f"=== [PROFILING] Total latency: {latency_ms}ms ===\n>>> [PROFILING END] <<<\n\n")
    sys.stdout.flush()

    return _result(msg_data, user_msg, mood_payload)


def _result(msg_data, user_msg, mood_payload):
    return {"message": msg_data, "user_message_id": str(user_msg.id), "persona": mood_payload}


def _log(msg: str):
    from services.janitor_service import add_system_log
    add_system_log(msg)
