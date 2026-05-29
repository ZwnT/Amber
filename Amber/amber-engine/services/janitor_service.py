import asyncio
import json
import random
from datetime import datetime, timezone

import state
from database import SessionLocal, Persona, Message, PersonaCorpus
from contextlib import contextmanager


@contextmanager
def get_db_context():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def add_system_log(msg: str):
    print(msg)
    time_str = datetime.now().strftime("%H:%M:%S")
    state.system_stats["logs"].append(f"[JANITOR] {time_str} - {msg}")
    if len(state.system_stats["logs"]) > 50:
        state.system_stats["logs"].pop(0)


async def janitor_loop():
    add_system_log("[Janitor 守护进程] 已启动，将在后台每 60 秒执行一次记忆代谢...")

    while True:
        await asyncio.sleep(60)
        debug_incubation_limit = state.system_stats.get("incubation_interval_min", 5)

        with get_db_context() as db:
            try:
                # 0. Zombie relay scan
                active_ids = [p.id for p in db.query(Persona.id).all()]
                if state.qq_relay:
                    for rid in list(state.qq_relay.relays.keys()):
                        if rid not in active_ids:
                            print(f"【Janitor】发现僵尸中继 {rid}，执行关停...")
                            await state.qq_relay.stop(rid)

                now = datetime.now(timezone.utc)
                deleted_count = 0

                # 1. Weight decay
                for msg in db.query(Message).filter(Message.is_pinned == False).all():
                    diff = (now - msg.timestamp.replace(tzinfo=timezone.utc)).total_seconds() / 60.0
                    msg.weight = 1.0 * (0.95 ** diff)

                for corpus in db.query(PersonaCorpus).filter(PersonaCorpus.is_pinned == False).all():
                    diff = (now - corpus.timestamp.replace(tzinfo=timezone.utc)).total_seconds() / 60.0
                    corpus.weight = 1.0 * (0.95 ** diff)
                    if corpus.weight < 0.30:
                        db.delete(corpus)
                        deleted_count += 1

                # 2. Emotion annealing + mood WebSocket push
                from ws_manager import manager as ws_manager
                personas = db.query(Persona).all()
                for p in personas:
                    if p.anger > 0:
                        p.anger = max(0, p.anger - 5)
                    if p.anxiety > 0:
                        p.anxiety = max(0, p.anxiety - 5)
                    if p.happiness > 50:
                        p.happiness = max(50, p.happiness - 2)
                    elif p.happiness < 50:
                        p.happiness = min(50, p.happiness + 2)
                    add_system_log(f"{p.name} 状态自愈 -> H:{p.happiness}% A:{p.anger}% X:{p.anxiety}%")
                    await ws_manager.broadcast(p.id, {"type": "mood", "data": {"happiness": p.happiness, "anger": p.anger, "anxiety": p.anxiety}})

                # 3. Active override (proactive QQ message)
                for p in personas:
                    if not p.is_override_active or not state.qq_relay:
                        continue
                    is_online = p.id in state.qq_relay.relays and state.qq_relay.relays[p.id].get("is_connected")
                    if not is_online:
                        continue
                    if not p.last_interaction_time:
                        continue
                    diff_min = (now - p.last_interaction_time.replace(tzinfo=timezone.utc)).total_seconds() / 60.0
                    if diff_min < p.override_interval:
                        continue

                    add_system_log(f"【意识觉醒】分身 {p.name} 达到冷落阈值，进行觉醒掷骰...")
                    is_test = state.system_stats.get("janitor_test_mode", False)
                    if not (is_test or random.random() < 0.10):
                        add_system_log(f"【意识觉醒】🎲 掷骰未摇中，{p.name} 继续沉睡。")
                        continue

                    relay_info = state.qq_relay.relays[p.id]
                    api_cfg = relay_info.get("api_config", {})
                    from schemas import ChatRequest
                    chat_req = ChatRequest(
                        content="（[系统底层指令]：你已经很久没和宿主说话了。请从你的脑皮层碎片中挑选一个细节，给宿主发一条符合性格的消息。字数40字以内。严禁套路化模板。）",
                        api_key=api_cfg.get("api_key"),
                        base_url=api_cfg.get("base_url"),
                        model_id=api_cfg.get("model_id"),
                    )
                    try:
                        from services.chat_service import handle_chat_internal
                        response = await handle_chat_internal(p.id, chat_req, db, is_automated=True)
                        ai_reply = response["message"]["content"]
                        client_obj = relay_info["client"]
                        ctx = getattr(client_obj, "last_msg_context", None)
                        if not ctx and p.last_relay_context:
                            try:
                                ctx = json.loads(p.last_relay_context)
                            except Exception:
                                ctx = None
                        if ctx:
                            msg_seq = random.randint(1000, 999999)
                            suffix = "​"
                            if ctx["type"] == "direct":
                                await client_obj.api.post_dms_messages(guild_id=ctx["guild_id"], content=ai_reply + suffix, msg_seq=msg_seq)
                            elif ctx["type"] == "group":
                                await client_obj.api.post_group_message(group_openid=ctx["group_openid"], msg_type=0, content=ai_reply + suffix, msg_id=ctx["msg_id"], msg_seq=msg_seq)
                            elif ctx["type"] == "c2c":
                                openid = ctx.get("openid")
                                if openid:
                                    await client_obj.api.post_c2c_message(openid=openid, msg_type=0, content=ai_reply + suffix, msg_id=ctx["msg_id"], msg_seq=msg_seq)
                            add_system_log(f"【意识觉醒】{p.name} 主动查岗已下发至 QQ。")
                    except Exception as e:
                        add_system_log(f"【意识觉醒】物理故障: {e}")

                # 4. Memory incubation (dream crystallization)
                for p in db.query(Persona).all():
                    if not p.last_incubation_time:
                        p.last_incubation_time = datetime.now(timezone.utc)
                        db.commit()
                        continue
                    diff_min = (datetime.now(timezone.utc).replace(tzinfo=None) - p.last_incubation_time).total_seconds() / 60.0
                    if diff_min < debug_incubation_limit:
                        continue

                    add_system_log(f"【睡梦扫描】分身 {p.name} 进入 R.E.M 期...")
                    new_msgs = db.query(Message).filter(
                        Message.persona_id == p.id,
                        Message.timestamp > p.last_incubation_time,
                        Message.is_filtered == False,
                    ).order_by(Message.timestamp.asc()).all()

                    if not new_msgs:
                        add_system_log(f"【睡梦扫描】{p.name} 近期无新刺激，跳过结晶。")
                        p.last_incubation_time = datetime.now(timezone.utc)
                        db.commit()
                        continue

                    api_cfg = {}
                    if state.qq_relay and p.id in state.qq_relay.relays:
                        api_cfg = state.qq_relay.relays[p.id].get("api_config", {})
                    llm_key = api_cfg.get("api_key") or state.system_stats.get("global_api_key")
                    llm_url = api_cfg.get("base_url") or state.system_stats.get("global_base_url") or "https://api.openai.com/v1"
                    llm_model = api_cfg.get("model_id") or state.system_stats.get("global_model_id") or "gpt-4o-mini"

                    if not llm_key:
                        add_system_log(f"【睡梦扫描】{p.name} 缺失 API KEY，跳过结晶。")
                        continue

                    chat_bundle = "\n".join([f"{'用户' if m.role == 'user' else p.name}: {m.content}" for m in new_msgs])
                    prompt = f"""你现在是数字生命意识流的最高压缩结晶器。请将输入的原始对话，深度蒸馏为一行高密度的【核心记忆（Core Memory）】。

【文风刚性约束】：
1. 【绝对第一人称】：必须以分身（我/本系统）视角出发，将宿主称呼为"你"。
2. 【工业极客美学】：用词精准、冷峻且具备灵魂羁绊感。
3. 【信息密度】：字数严格控制在 200-300 字之间。

【核心结晶三层逻辑】：
1. 宿主客观态势：精准剥离当前生存压力或具体困境。
2. 宿主心理防御：捕捉言语掩饰下隐藏的真实波动。
3. 本系统底座态势：如何死锁此段记忆并提供底层托底响应。

【近期对话流】：
{chat_bundle}
"""
                    try:
                        from openai import AsyncOpenAI
                        from services.chat_service import call_llm_with_retry
                        client = AsyncOpenAI(api_key=llm_key, base_url=llm_url)
                        response = await call_llm_with_retry(
                            client=client,
                            model=llm_model,
                            messages=[{"role": "system", "content": prompt}],
                            temperature=0.3,
                        )
                        crystal_text = response.choices[0].message.content.strip()
                        timestamp_tag = datetime.now().strftime('%Y-%m-%d %H:%M')
                        db.add(PersonaCorpus(persona_id=p.id, content=f"[{timestamp_tag} 结晶]: {crystal_text}", weight=1.0, is_pinned=False))
                        p.last_incubation_time = datetime.now(timezone.utc)
                        db.commit()
                        add_system_log(f"【睡梦扫描】✅ {p.name} 已固化一条长时记忆碎片。")
                    except Exception as e:
                        add_system_log(f"【睡梦扫描】LLM 提炼失败: {e}")
                        db.rollback()

                db.commit()
                state.system_stats["janitor_deleted_last_min"] = deleted_count
                state.system_stats["janitor_last_run"] = now.isoformat()
                add_system_log(f"[Janitor 心跳] 代谢完成，清除 {deleted_count} 条过期记忆。" if deleted_count else "[Janitor 心跳] 内稳态健康。")
            except Exception as e:
                db.rollback()
                add_system_log(f"【Janitor 异常】: {e}")
