import asyncio
import json
import re
from contextlib import contextmanager
from datetime import datetime, timezone

import botpy
from botpy.message import DirectMessage, Message as QQMessage

from database import SessionLocal, Persona
from schemas import ChatRequest


@contextmanager
def get_db_context():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class QQBotRelay:
    def __init__(self):
        self.relays: dict = {}
        self.processed_msg_ids: set = set()

    async def start(self, persona_id: str, appid: str, secret: str,
                    api_key: str = None, base_url: str = None, model_id: str = None):
        if persona_id in self.relays and self.relays[persona_id].get("is_connected"):
            await self.stop(persona_id)

        api_config = {"api_key": api_key, "base_url": base_url, "model_id": model_id}
        processed_pool = self.processed_msg_ids
        relay_ref = self

        class AmberQQClient(botpy.Client):
            def __init__(self, target_persona_id, api_config, app_id, *args, **kwargs):
                super().__init__(*args, **kwargs)
                self.target_persona_id = target_persona_id
                self.api_config = api_config
                self.app_id = app_id
                self.last_msg_context = None

            async def on_ready(self):
                print(f"【战线二：QQ 中继】机器人已上线！(AppID: {self.app_id})")

            async def on_error(self, exception):
                print(f"【战线二：QQ 中继】链路故障 (AppID: {self.app_id}): {exception}")

            async def on_at_message_create(self, message: QQMessage):
                await self.process_qq_message(message)

            async def on_direct_message_create(self, message: DirectMessage):
                await self.process_qq_message(message)

            async def on_group_at_message_create(self, message):
                await self.process_qq_message(message)

            async def on_c2c_message_create(self, message):
                await self.process_qq_message(message)

            async def process_qq_message(self, message):
                msg_id = getattr(message, "id", None)
                if not msg_id or msg_id in processed_pool:
                    return
                processed_pool.add(msg_id)
                if len(processed_pool) > 1000:
                    processed_pool.pop()

                now_str = datetime.now(timezone.utc).isoformat()
                ctx = None
                if hasattr(message, "guild_id"):
                    ctx = {"type": "direct", "guild_id": message.guild_id, "msg_id": message.id, "timestamp": now_str}
                elif hasattr(message, "group_openid"):
                    ctx = {"type": "group", "group_openid": message.group_openid, "msg_id": message.id, "timestamp": now_str}
                elif hasattr(message, "author") and hasattr(message.author, "user_openid"):
                    ctx = {"type": "c2c", "openid": message.author.user_openid, "msg_id": message.id, "timestamp": now_str}

                if ctx:
                    self.last_msg_context = ctx
                    with get_db_context() as db:
                        p = db.query(Persona).filter(Persona.id == self.target_persona_id).first()
                        if p:
                            p.last_relay_context = json.dumps(ctx)
                            db.commit()

                raw = getattr(message, "content", "")
                content = re.sub(r'<@!\d+>', '', raw).strip()
                if not content:
                    return

                print(f"【战线二：QQ 中继】接收 -> {getattr(message.author, 'username', '未知')}: {content}")

                with get_db_context() as db:
                    if not db.query(Persona).filter(Persona.id == self.target_persona_id).first():
                        print(f"【战线二：QQ 中继】找不到分身 {self.target_persona_id}，关停僵尸进程...")
                        asyncio.create_task(relay_ref.stop(self.target_persona_id))
                        return

                    chat_req = ChatRequest(
                        content=content,
                        api_key=self.api_config.get("api_key"),
                        base_url=self.api_config.get("base_url"),
                        model_id=self.api_config.get("model_id"),
                    )
                    try:
                        from services.chat_service import handle_chat_internal
                        response = await handle_chat_internal(self.target_persona_id, chat_req, db, skip_relay=True)
                        if "error" in response:
                            return
                        ai_reply = response["message"]["content"]
                        if hasattr(message, "reply"):
                            await message.reply(content=ai_reply)
                        elif isinstance(message, DirectMessage):
                            await self.api.post_dms_messages(guild_id=message.guild_id, content=ai_reply, msg_id=message.id)
                        elif hasattr(self.api, "post_group_message") and hasattr(message, "group_openid"):
                            await self.api.post_group_message(group_openid=message.group_openid, msg_type=0, content=ai_reply, msg_id=message.id)
                        elif hasattr(self.api, "post_c2c_message") and hasattr(message, "author"):
                            await self.api.post_c2c_message(openid=message.author.user_openid, msg_type=0, content=ai_reply, msg_id=message.id)
                    except Exception as e:
                        print(f"【战线二：QQ 中继】回复故障: {e}")

        async def run_bot():
            retry_count = 0
            while persona_id in self.relays:
                current_client = AmberQQClient(
                    target_persona_id=persona_id,
                    api_config=api_config,
                    app_id=appid,
                    intents=botpy.Intents.all(),
                )
                if persona_id in self.relays:
                    self.relays[persona_id]["client"] = current_client
                try:
                    await current_client.start(appid=appid, secret=secret)
                except Exception as e:
                    print(f"【战线二：QQ 中继】连接中断: {e}")
                if persona_id in self.relays:
                    retry_count += 1
                    wait = min(2 ** retry_count, 60)
                    print(f"【战线二：QQ 中继】{wait}s 后自动重连...")
                    await asyncio.sleep(wait)
                else:
                    break

        task = asyncio.create_task(run_bot())
        self.relays[persona_id] = {"client": None, "task": task, "is_connected": True, "appid": appid, "api_config": api_config}
        print(f"【战线二：QQ 中继】分身 {persona_id} (AppID: {appid}) 热启动成功。")

    async def stop(self, persona_id: str):
        if persona_id in self.relays:
            relay = self.relays.pop(persona_id)
            if relay["client"]:
                await relay["client"].close()
            if relay["task"]:
                relay["task"].cancel()
            print(f"【战线二：QQ 中继】分身 {persona_id} 已断开。")

    def get_status(self, persona_id: str) -> dict:
        relay = self.relays.get(persona_id)
        if relay:
            return {"is_connected": relay["is_connected"], "appid": relay["appid"]}
        return {"is_connected": False, "appid": ""}
