import json
from typing import List, Optional

from sqlalchemy.orm import Session

from database import Persona


def list_personas(db: Session) -> List[dict]:
    personas = db.query(Persona).all()
    result = []
    for p in personas:
        d = p.__dict__.copy()
        d.pop("_sa_instance_state", None)
        try:
            d["traits"] = json.loads(p.traits) if p.traits else []
            d["catchphrases"] = json.loads(p.catchphrases) if p.catchphrases else []
        except Exception:
            d["traits"] = []
            d["catchphrases"] = []
        result.append(d)
    return result


def get_persona(db: Session, persona_id: str) -> Optional[Persona]:
    return db.query(Persona).filter(Persona.id == persona_id).first()


def create_persona(db: Session, **kwargs) -> Persona:
    p = Persona(**kwargs)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def update_persona(db: Session, persona_id: str, **kwargs) -> Optional[Persona]:
    p = db.query(Persona).filter(Persona.id == persona_id).first()
    if not p:
        return None
    for key, value in kwargs.items():
        setattr(p, key, value)
    db.commit()
    db.refresh(p)
    return p


def delete_persona(db: Session, persona_id: str) -> bool:
    p = db.query(Persona).filter(Persona.id == persona_id).first()
    if not p:
        return False
    db.delete(p)
    db.commit()
    return True


def serialize_persona(p: Persona) -> dict:
    d = p.__dict__.copy()
    d.pop("_sa_instance_state", None)
    try:
        d["traits"] = json.loads(p.traits) if p.traits else []
        d["catchphrases"] = json.loads(p.catchphrases) if p.catchphrases else []
    except Exception:
        d["traits"] = []
        d["catchphrases"] = []
    return d
