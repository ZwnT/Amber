from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from schemas import ChargeRequest, TogglePinRequest
from repositories.message_repo import get_corpus, charge_corpus, toggle_pin_corpus, erase_corpus

router = APIRouter(prefix="/api/system/memory", tags=["memory"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/{persona_id}")
def get_memory(persona_id: str, db: Session = Depends(get_db)):
    return get_corpus(db, persona_id)


@router.post("/charge")
def charge_memory(req: ChargeRequest, db: Session = Depends(get_db)):
    result = charge_corpus(db, req.corpus_id)
    if not result:
        raise HTTPException(status_code=404, detail="Corpus not found")
    return result


@router.post("/toggle-pin")
def toggle_pin(req: TogglePinRequest, db: Session = Depends(get_db)):
    result = toggle_pin_corpus(db, req.corpus_id)
    if not result:
        raise HTTPException(status_code=404, detail="Corpus not found")
    return result


@router.delete("/erase/{corpus_id}")
def erase_memory(corpus_id: int, db: Session = Depends(get_db)):
    if not erase_corpus(db, corpus_id):
        raise HTTPException(status_code=404, detail="Corpus not found")
    return {"status": "success"}
