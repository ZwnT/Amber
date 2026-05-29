import asyncio
import json
import os
import re
import sys

from contextlib import contextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

# Load .env if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import state
from database import SessionLocal, Base, engine, Persona
from services.relay_service import QQBotRelay
from services.janitor_service import janitor_loop, add_system_log
from routers import personas, chat, relay, memory, system, ws as ws_router

# --- App factory ---
app = FastAPI(title="Amber Engine API", description="数字生命核心引擎")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(personas.router)
app.include_router(chat.router)
app.include_router(relay.router)
app.include_router(memory.router)
app.include_router(system.router)
app.include_router(ws_router.router)


@contextmanager
def get_db_context():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.on_event("startup")
async def startup_event():
    # Init global relay singleton (avoids circular import at module level)
    state.qq_relay = QQBotRelay()

    # Schema migrations
    with get_db_context() as db:
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
            ("persona_corpus", "is_pinned", "BOOLEAN DEFAULT 0"),
        ]
        for table, column, col_type in migrations:
            try:
                db.execute(text(f"SELECT {column} FROM {table} LIMIT 1"))
            except Exception:
                db.rollback()
                try:
                    print(f"【数据库修复】补全字段: {table}.{column}...")
                    db.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
                    db.commit()
                except Exception as e:
                    print(f"【数据库修复】失败: {e}")
                    db.rollback()

    # Traits cleanup
    with get_db_context() as db:
        try:
            for p in db.query(Persona).all():
                if not p.traits:
                    continue
                try:
                    raw = " ".join([str(t) for t in json.loads(p.traits)]) if p.traits.startswith("[") else str(p.traits)
                    raw = raw.replace("\n", " ").replace("\r", " ").strip()
                    match = re.search(r"(\[核心特质\]:.*?\[情绪阈值\]:.*?\(\d+%\).*?\(\d+%\).*?\(\d+%\))", raw)
                    if match:
                        p.traits = json.dumps([match.group(1)], ensure_ascii=False)
                except Exception as e:
                    print(f"清洗分身 {p.name} 失败: {e}")
            db.commit()
        except Exception as e:
            print(f"【全局洗盘失败】: {e}")
            db.rollback()

    asyncio.create_task(janitor_loop())
    add_system_log("Amber Engine 启动完成。")


if __name__ == "__main__":
    import uvicorn
    is_frozen = getattr(sys, "frozen", False)
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    if is_frozen:
        uvicorn.run(app, host=host, port=port, reload=False, workers=1, log_level="info", use_colors=False)
    else:
        uvicorn.run("main:app", host=host, port=port, reload=True)
