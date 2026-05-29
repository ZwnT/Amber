from typing import List, Optional

from sqlalchemy.orm import Session

from database import Message, PersonaCorpus


def get_chat_history(db: Session, persona_id: str) -> List[dict]:
    messages = (
        db.query(Message)
        .filter(Message.persona_id == persona_id, Message.is_filtered == False)
        .order_by(Message.timestamp.asc())
        .all()
    )
    return [
        {
            "id": str(m.id),
            "persona_id": m.persona_id,
            "role": m.role,
            "content": m.content,
            "is_filtered": m.is_filtered,
            "timestamp": m.timestamp.isoformat(),
        }
        for m in messages
    ]


def clear_history(db: Session, persona_id: str) -> tuple[int, int]:
    msgs = db.query(Message).filter(Message.persona_id == persona_id).delete()
    corpus = db.query(PersonaCorpus).filter(PersonaCorpus.persona_id == persona_id).delete()
    db.commit()
    return msgs, corpus


def get_corpus(db: Session, persona_id: str) -> List[dict]:
    rows = (
        db.query(PersonaCorpus)
        .filter(PersonaCorpus.persona_id == persona_id)
        .order_by(PersonaCorpus.is_pinned.desc(), PersonaCorpus.weight.desc())
        .all()
    )
    return [
        {"id": c.id, "content": c.content, "weight": c.weight, "is_pinned": c.is_pinned, "timestamp": c.timestamp.isoformat()}
        for c in rows
    ]


def get_corpus_entry(db: Session, corpus_id: int) -> Optional[PersonaCorpus]:
    return db.query(PersonaCorpus).filter(PersonaCorpus.id == corpus_id).first()


def charge_corpus(db: Session, corpus_id: int) -> Optional[dict]:
    c = get_corpus_entry(db, corpus_id)
    if not c:
        return None
    c.weight = 1.0
    db.commit()
    return {"status": "success", "weight": 1.0}


def toggle_pin_corpus(db: Session, corpus_id: int) -> Optional[dict]:
    c = get_corpus_entry(db, corpus_id)
    if not c:
        return None
    c.is_pinned = not c.is_pinned
    if c.is_pinned:
        c.weight = 1.0
    db.commit()
    return {"status": "success", "is_pinned": c.is_pinned, "weight": c.weight}


def erase_corpus(db: Session, corpus_id: int) -> bool:
    c = get_corpus_entry(db, corpus_id)
    if not c:
        return False
    db.delete(c)
    db.commit()
    return True
