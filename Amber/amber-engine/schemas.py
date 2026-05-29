from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class PersonaBase(BaseModel):
    name: str
    gender: str
    relationship_desc: str
    impression: str
    avatar: Optional[str] = None
    token: Optional[str] = None
    core_memory: str
    traits: List[str]
    catchphrases: List[str]
    stability: float
    synchronization: float
    is_override_active: Optional[bool] = False
    override_interval: Optional[int] = 180
    bot_app_id: Optional[str] = None
    bot_app_secret: Optional[str] = None
    bot_token: Optional[str] = None


class PersonaCreate(PersonaBase):
    id: Optional[str] = None
    raw_corpus: Optional[str] = None


class PersonaResponse(PersonaBase):
    id: str
    happiness: float
    anger: float
    anxiety: float
    last_interaction_time: Optional[datetime] = None
    last_relay_context: Optional[str] = None

    class Config:
        from_attributes = True


class MessageBase(BaseModel):
    persona_id: str
    role: str
    content: str
    is_filtered: bool = False


class MessageCreate(MessageBase):
    pass


class MessageResponse(MessageBase):
    id: int
    timestamp: str

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    content: str
    api_key: Optional[str] = None
    base_url: Optional[str] = "https://api.openai.com/v1"
    model_id: Optional[str] = "gpt-4o-mini"


class RelayConfigRequest(BaseModel):
    bot_type: str
    appid: str
    secret: str
    persona_id: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model_id: Optional[str] = None


class PersonaIdRequest(BaseModel):
    persona_id: str


class ChargeRequest(BaseModel):
    corpus_id: int


class TogglePinRequest(BaseModel):
    corpus_id: int


class RedistillRequest(BaseModel):
    persona_id: str
    name: str
    avatar: Optional[str] = None
    core_memory: str
    traits_map: dict
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model_id: Optional[str] = None


class CommitUpdateRequest(BaseModel):
    persona_id: str
    name: str
    avatar: Optional[str] = None
    core_memory: str
    traits: Optional[List[str]] = None
    stability: Optional[float] = None
    synchronization: Optional[float] = None
