import json
from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, persona_id: str):
        await websocket.accept()
        self.active.setdefault(persona_id, []).append(websocket)

    def disconnect(self, websocket: WebSocket, persona_id: str):
        conns = self.active.get(persona_id, [])
        if websocket in conns:
            conns.remove(websocket)

    async def broadcast(self, persona_id: str, payload: dict):
        conns = self.active.get(persona_id, [])
        dead = []
        for ws in conns:
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, persona_id)


manager = ConnectionManager()
