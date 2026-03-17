"""
WebSocket Messaging Router - Real-time connection management for messaging.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, List
import json
import logging

from ..middleware.auth_middleware import get_current_user_ws

router = APIRouter(prefix="/ws", tags=["WebSockets"])
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps user_id : list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"User {user_id} connected. Active connections: {len(self.active_connections[user_id])}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"User {user_id} disconnected.")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def send_json_to_user(self, user_id: str, data: dict):
        """Sends a JSON payload to all active web sockets for a specific user."""
        if user_id in self.active_connections:
            payload = json.dumps(data)
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(payload)
                except Exception as e:
                    logger.error(f"Error sending to websocket for {user_id}: {e}")
                    # Will be cleaned up on next ping/disconnect

manager = ConnectionManager()

@router.websocket("/user")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str = Depends(get_current_user_ws)
):
    """
    WebSocket endpoint for real-time messaging.
    Connect with: ws://localhost:8000/api/ws/user?token=<JWT>
    """
    await manager.connect(websocket, user_id)
    try:
        while True:
            # We don't actively expect incoming messages from the client in this design
            # (they still use POST /messages to save to DB), but we need to receive 
            # to keep the connection alive and detect disconnects.
            data = await websocket.receive_text()
            
            # Simple ping/pong could be added here
            if data == "ping":
                await websocket.send_text("pong")
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket Error for {user_id}: {e}")
        manager.disconnect(websocket, user_id)
