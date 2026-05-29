from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session

import state
from database import SessionLocal, Persona
from schemas import RelayConfigRequest
from contextlib import contextmanager

router = APIRouter(prefix="/api/relay", tags=["relay"])


@contextmanager
def get_db_context():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/test")
async def test_relay(req: RelayConfigRequest):
    if req.bot_type != "QQ Bot":
        raise HTTPException(status_code=400, detail="Unsupported bot type")
    try:
        if not req.appid.isdigit() or len(req.appid) < 8:
            raise Exception("AppID 格式不正确")
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://bots.qq.com/app/getAppAccessToken",
                json={"appId": req.appid, "clientSecret": req.secret},
                timeout=5,
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if "access_token" in data:
                        return {"status": "success", "message": "腾讯中继鉴权通过，配置合法！"}
                    raise Exception(data.get("message", "AppID 或 AppSecret 匹配失败"))
                raise Exception(f"腾讯服务器响应异常 (HTTP {resp.status})")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"鉴权预检失败: {str(e)}")


@router.post("/connect")
async def connect_relay(req: RelayConfigRequest):
    persona_id = req.persona_id
    if not persona_id:
        with get_db_context() as db:
            p = db.query(Persona).first()
            if not p:
                raise HTTPException(status_code=404, detail="No persona found")
            persona_id = p.id
    if state.qq_relay:
        await state.qq_relay.start(persona_id, req.appid, req.secret, api_key=req.api_key, base_url=req.base_url, model_id=req.model_id)
    return {"status": "connected", "persona_id": persona_id}


@router.post("/disconnect")
async def disconnect_relay(persona_id: str):
    if state.qq_relay:
        await state.qq_relay.stop(persona_id)
    return {"status": "disconnected"}


@router.get("/status/{persona_id}")
def get_relay_status(persona_id: str):
    if state.qq_relay:
        return state.qq_relay.get_status(persona_id)
    return {"is_connected": False, "appid": ""}
