from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import SessionLocal
from schemas import ChatRequest
from repositories.message_repo import get_chat_history
from services.chat_service import handle_chat_internal

router = APIRouter(prefix="/api", tags=["chat"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/chat/{persona_id}")
def get_chat(persona_id: str, db: Session = Depends(get_db)):
    try:
        return get_chat_history(db, persona_id)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"获取聊天记录失败: {e}")
        return []


@router.post("/chat/{persona_id}")
async def chat_with_persona(persona_id: str, req: ChatRequest, db: Session = Depends(get_db)):
    return await handle_chat_internal(persona_id, req, db)
