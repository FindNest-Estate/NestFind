"""
Messaging Service - Handles conversations and messages between buyers and agents.
"""
from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime
import asyncpg


class MessagingService:
    """
    Service for managing buyer-agent messaging.
    """
    
    def __init__(self, db: asyncpg.Pool):
        self.db = db
    
    async def get_or_create_conversation(
        self,
        user_id: UUID,
        agent_id: UUID,
        property_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Get existing conversation or create new one.
        """
        async with self.db.acquire() as conn:
            # Check for existing conversation
            existing = await conn.fetchrow(
                """
                SELECT id FROM conversations
                WHERE buyer_id = $1 AND agent_id = $2 
                AND (property_id = $3 OR (property_id IS NULL AND $3 IS NULL))
                """,
                user_id,
                agent_id,
                property_id
            )
            
            if existing:
                return {"success": True, "conversation_id": str(existing["id"]), "is_new": False}
            
            # Create new conversation
            conv_id = await conn.fetchval(
                """
                INSERT INTO conversations (property_id, buyer_id, agent_id)
                VALUES ($1, $2, $3)
                RETURNING id
                """,
                property_id,
                user_id,
                agent_id
            )
            
            return {"success": True, "conversation_id": str(conv_id), "is_new": True}
    
    async def get_user_conversations(
        self,
        user_id: UUID,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """
        Get all conversations for a user (as buyer or agent).
        """
        offset = (page - 1) * per_page
        
        async with self.db.acquire() as conn:
            # Count total
            total = await conn.fetchval(
                """
                SELECT COUNT(*) FROM conversations
                WHERE buyer_id = $1 OR agent_id = $1
                """,
                user_id
            )
            
            # Get conversations with last message and other party info
            rows = await conn.fetch(
                """
                SELECT 
                    c.id, c.property_id, c.buyer_id, c.agent_id, 
                    c.created_at, c.updated_at,
                    p.title as property_title,
                    buyer.full_name as buyer_name, buyer.email as buyer_email,
                    agent.full_name as agent_name, agent.email as agent_email,
                    (SELECT content FROM messages WHERE conversation_id = c.id 
                     ORDER BY created_at DESC LIMIT 1) as last_message,
                    (SELECT created_at FROM messages WHERE conversation_id = c.id 
                     ORDER BY created_at DESC LIMIT 1) as last_message_at,
                    (SELECT COUNT(*) FROM messages 
                     WHERE conversation_id = c.id AND sender_id != $1 AND read_at IS NULL) as unread_count
                FROM conversations c
                LEFT JOIN properties p ON c.property_id = p.id
                JOIN users buyer ON c.buyer_id = buyer.id
                JOIN users agent ON c.agent_id = agent.id
                WHERE c.buyer_id = $1 OR c.agent_id = $1
                ORDER BY c.updated_at DESC
                LIMIT $2 OFFSET $3
                """,
                user_id,
                per_page,
                offset
            )
            
            conversations = []
            for row in rows:
                # Determine other party
                is_buyer = row["buyer_id"] == user_id
                other_party = {
                    "id": str(row["agent_id"] if is_buyer else row["buyer_id"]),
                    "name": row["agent_name"] if is_buyer else row["buyer_name"],
                    "email": row["agent_email"] if is_buyer else row["buyer_email"],
                    "role": "agent" if is_buyer else "buyer"
                }
                
                conversations.append({
                    "id": str(row["id"]),
                    "property_id": str(row["property_id"]) if row["property_id"] else None,
                    "property_title": row["property_title"],
                    "other_party": other_party,
                    "last_message": row["last_message"],
                    "last_message_at": row["last_message_at"].isoformat() if row["last_message_at"] else None,
                    "unread_count": row["unread_count"],
                    "updated_at": row["updated_at"].isoformat()
                })
            
            return {
                "success": True,
                "conversations": conversations,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "has_more": (page * per_page) < total
                }
            }
    
    async def get_messages(
        self,
        conversation_id: UUID,
        user_id: UUID,
        page: int = 1,
        per_page: int = 50
    ) -> Dict[str, Any]:
        """
        Get messages in a conversation.
        """
        offset = (page - 1) * per_page
        
        async with self.db.acquire() as conn:
            # Verify user is part of conversation
            conv = await conn.fetchrow(
                """
                SELECT id, buyer_id, agent_id FROM conversations
                WHERE id = $1 AND (buyer_id = $2 OR agent_id = $2)
                """,
                conversation_id,
                user_id
            )
            
            if not conv:
                return {"success": False, "error": "Conversation not found", "code": 404}
            
            # Get total
            total = await conn.fetchval(
                "SELECT COUNT(*) FROM messages WHERE conversation_id = $1",
                conversation_id
            )
            
            # Get messages
            rows = await conn.fetch(
                """
                SELECT m.id, m.sender_id, m.content, m.read_at, m.created_at,
                       u.full_name as sender_name
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.conversation_id = $1
                ORDER BY m.created_at DESC
                LIMIT $2 OFFSET $3
                """,
                conversation_id,
                per_page,
                offset
            )
            
            messages = [
                {
                    "id": str(row["id"]),
                    "sender_id": str(row["sender_id"]),
                    "sender_name": row["sender_name"],
                    "content": row["content"],
                    "is_own": row["sender_id"] == user_id,
                    "read_at": row["read_at"].isoformat() if row["read_at"] else None,
                    "created_at": row["created_at"].isoformat()
                }
                for row in reversed(rows)  # Reverse to show oldest first
            ]
            
            return {
                "success": True,
                "messages": messages,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "has_more": (page * per_page) < total
                }
            }
    
    async def send_message(
        self,
        conversation_id: UUID,
        sender_id: UUID,
        content: str
    ) -> Dict[str, Any]:
        """
        Send a message in a conversation.
        """
        if not content or not content.strip():
            return {"success": False, "error": "Message cannot be empty", "code": 400}
        
        async with self.db.acquire() as conn:
            # Verify user is part of conversation
            conv = await conn.fetchrow(
                """
                SELECT id, buyer_id, agent_id FROM conversations
                WHERE id = $1 AND (buyer_id = $2 OR agent_id = $2)
                """,
                conversation_id,
                sender_id
            )
            
            if not conv:
                return {"success": False, "error": "Conversation not found", "code": 404}
            
            # Insert message
            msg_id = await conn.fetchval(
                """
                INSERT INTO messages (conversation_id, sender_id, content)
                VALUES ($1, $2, $3)
                RETURNING id
                """,
                conversation_id,
                sender_id,
                content.strip()
            )
            
            # Create notification for recipient
            recipient_id = conv["agent_id"] if conv["buyer_id"] == sender_id else conv["buyer_id"]
            
            # Get sender name for notification
            sender_name = await conn.fetchval(
                "SELECT full_name FROM users WHERE id = $1",
                sender_id
            )
            
            await conn.execute(
                """
                INSERT INTO notifications (user_id, type, title, body, link)
                VALUES ($1, 'new_message', $2, $3, $4)
                """,
                recipient_id,
                f"New message from {sender_name}",
                content[:100] + ("..." if len(content) > 100 else ""),
                f"/messages/{conversation_id}"
            )
            
            return {
                "success": True,
                "message_id": str(msg_id)
            }
    
    async def mark_messages_read(
        self,
        conversation_id: UUID,
        user_id: UUID
    ) -> Dict[str, Any]:
        """
        Mark all messages in conversation as read (except own messages).
        """
        async with self.db.acquire() as conn:
            # Verify user is part of conversation
            conv = await conn.fetchrow(
                """
                SELECT id FROM conversations
                WHERE id = $1 AND (buyer_id = $2 OR agent_id = $2)
                """,
                conversation_id,
                user_id
            )
            
            if not conv:
                return {"success": False, "error": "Conversation not found", "code": 404}
            
            # Mark messages read
            await conn.execute(
                """
                UPDATE messages 
                SET read_at = NOW()
                WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL
                """,
                conversation_id,
                user_id
            )
            
            return {"success": True}
