import asyncio
from typing import Dict, List, Any
from uuid import UUID
import json
import logging

logger = logging.getLogger(__name__)

class SSEManager:
    """
    Manages Server-Sent Events (SSE) connections for real-time updates.
    Maps user_id -> List[asyncio.Queue] to support multiple tabs/devices per user.
    """
    def __init__(self):
        # user_id -> list of queues
        self.connections: Dict[str, List[asyncio.Queue]] = {}
        self.lock = asyncio.Lock()

    async def connect(self, user_id: UUID) -> asyncio.Queue:
        """Create a new connection queue for a user."""
        queue = asyncio.Queue()
        user_key = str(user_id)
        
        async with self.lock:
            if user_key not in self.connections:
                self.connections[user_key] = []
            self.connections[user_key].append(queue)
            
        logger.info(f"User {user_key} connected to SSE. Total connections: {len(self.connections[user_key])}")
        return queue

    async def disconnect(self, user_id: UUID, queue: asyncio.Queue):
        """Remove a connection queue."""
        user_key = str(user_id)
        async with self.lock:
            if user_key in self.connections:
                if queue in self.connections[user_key]:
                    self.connections[user_key].remove(queue)
                
                if not self.connections[user_key]:
                    del self.connections[user_key]
        logger.info(f"User {user_key} disconnected from SSE.")

    async def broadcast(self, user_id: UUID, event_type: str, data: Any):
        """Send an event to all active connections for a user."""
        user_key = str(user_id)
        
        # Prepare payload
        message = {
            "type": event_type,
            "data": data
        }
        json_msg = json.dumps(message)
        
        async with self.lock:
            if user_key in self.connections:
                queues = self.connections[user_key]
                for q in queues:
                    await q.put(json_msg)
                logger.info(f"Broadcasted {event_type} to user {user_key} ({len(queues)} tabs)")

# Global instance
sse_manager = SSEManager()
