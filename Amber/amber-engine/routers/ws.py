from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ws_manager import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/{persona_id}")
async def websocket_endpoint(websocket: WebSocket, persona_id: str):
    await manager.connect(websocket, persona_id)
    try:
        while True:
            # Keep connection alive; client can send ping text
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, persona_id)
