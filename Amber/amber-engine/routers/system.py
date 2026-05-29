import random
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import state
from database import SessionLocal, Persona, Message, PersonaCorpus
from services.janitor_service import add_system_log

router = APIRouter(prefix="/api", tags=["system"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/system/status")
def get_system_status(persona_id: Optional[str] = None, db: Session = Depends(get_db)):
    corpus_count = db.query(PersonaCorpus).count()
    jitter = random.uniform(-0.5, 0.5)
    current_stability = round(max(95.0, min(99.8, 98.5 + jitter)), 1)

    response = {
        "latency": state.system_stats["last_latency_ms"],
        "corpus_count": corpus_count,
        "janitor_speed": state.system_stats["janitor_deleted_last_min"],
        "stability": current_stability,
        "janitor_test_mode": state.system_stats["janitor_test_mode"],
        "logs": state.system_stats["logs"],
    }
    if persona_id:
        p = db.query(Persona).filter(Persona.id == persona_id).first()
        if p:
            response["current_mood"] = {"happiness": p.happiness, "anger": p.anger, "anxiety": p.anxiety}
    return response


@router.post("/system/janitor-test-mode")
def toggle_janitor_test_mode(enabled: bool):
    state.system_stats["janitor_test_mode"] = enabled
    add_system_log(f"【系统指令】Janitor 测试模式已{'开启' if enabled else '关闭'}。")
    return {"status": "success", "janitor_test_mode": enabled}


@router.post("/system/config")
def update_system_config(config: dict):
    if "incubation_interval_min" in config:
        val = max(1, min(60, int(config["incubation_interval_min"])))
        state.system_stats["incubation_interval_min"] = val
        add_system_log(f"【系统指令】睡梦扫描间隔调整为 {val} 分钟")
    if "api_key" in config:
        state.system_stats["global_api_key"] = config["api_key"]
    if "base_url" in config:
        state.system_stats["global_base_url"] = config["base_url"]
    if "model_id" in config:
        state.system_stats["global_model_id"] = config["model_id"]
    return {"status": "success", "config": state.system_stats}


@router.post("/system/reset")
async def global_system_reset(db: Session = Depends(get_db)):
    if state.qq_relay:
        for rid in list(state.qq_relay.relays.keys()):
            await state.qq_relay.stop(rid)
    db.query(Message).delete()
    db.query(PersonaCorpus).delete()
    db.query(Persona).delete()
    db.commit()
    add_system_log("【最高指令】全局重置完成。")
    return {"status": "success", "message": "System reset completed"}
