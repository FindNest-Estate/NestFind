"""
Deal Events Service — Immutable event logging for deal timeline.

This service only performs INSERT operations. The deal_events table
is protected by DB triggers that block UPDATE/DELETE.
"""
from typing import Dict, Any, List, Optional
from uuid import UUID
import asyncpg
import json


class DealEventsService:
    """
    Append-only event log for deal timeline.
    
    Every deal state change, entity linkage, and notable action
    is recorded as an immutable event.
    """
    
    def __init__(self, db: asyncpg.Pool):
        self.db = db
    
    async def log_event(
        self,
        deal_id: UUID,
        event_type: str,
        actor_id: UUID,
        actor_role: str,
        from_status: Optional[str] = None,
        to_status: Optional[str] = None,
        notes: Optional[str] = None,
        metadata: Optional[dict] = None,
        conn: Optional[asyncpg.Connection] = None
    ) -> Dict[str, Any]:
        """
        Log an immutable event to the deal timeline.
        
        Args:
            deal_id: The deal this event belongs to
            event_type: One of deal_event_type enum values
            actor_id: User who triggered this event
            actor_role: BUYER, SELLER, AGENT, ADMIN, or SYSTEM
            from_status: Previous deal status (for STATUS_CHANGED)
            to_status: New deal status (for STATUS_CHANGED)
            notes: Human-readable description
            metadata: Additional JSON data
            conn: Optional existing connection (for use within transactions)
        """
        query = """
            INSERT INTO deal_events (
                deal_id, event_type, from_status, to_status,
                actor_id, actor_role, notes, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, deal_id, event_type, from_status, to_status,
                      actor_id, actor_role, notes, metadata, created_at
        """
        
        metadata_json = json.dumps(metadata) if metadata else '{}'
        
        if conn:
            event = await conn.fetchrow(
                query, deal_id, event_type, from_status, to_status,
                actor_id, actor_role, notes, metadata_json
            )
        else:
            async with self.db.acquire() as conn:
                event = await conn.fetchrow(
                    query, deal_id, event_type, from_status, to_status,
                    actor_id, actor_role, notes, metadata_json
                )
        
        return self._format_event(event)
    
    async def get_timeline(
        self,
        deal_id: UUID,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get the full immutable timeline for a deal.
        
        Returns events in chronological order (oldest first).
        """
        async with self.db.acquire() as conn:
            # Verify deal exists
            deal = await conn.fetchrow(
                "SELECT id FROM deals WHERE id = $1", deal_id
            )
            if not deal:
                return {"success": False, "error": "Deal not found"}
            
            # Get total count
            count = await conn.fetchval(
                "SELECT COUNT(*) FROM deal_events WHERE deal_id = $1", deal_id
            )
            
            # Get events in chronological order
            events = await conn.fetch("""
                SELECT de.*,
                       u.full_name as actor_name
                FROM deal_events de
                JOIN users u ON u.id = de.actor_id
                WHERE de.deal_id = $1
                ORDER BY de.created_at ASC
                LIMIT $2 OFFSET $3
            """, deal_id, limit, offset)
            
            return {
                "success": True,
                "events": [self._format_event(e, include_actor_name=True) for e in events],
                "total": count
            }
    
    def _format_event(self, event, include_actor_name: bool = False) -> dict:
        """Format a deal event record for API response."""
        result = {
            "id": str(event['id']),
            "deal_id": str(event['deal_id']),
            "event_type": event['event_type'],
            "from_status": event['from_status'],
            "to_status": event['to_status'],
            "actor_id": str(event['actor_id']),
            "actor_role": event['actor_role'],
            "notes": event['notes'],
            "metadata": json.loads(event['metadata']) if isinstance(event['metadata'], str) else (event['metadata'] or {}),
            "created_at": event['created_at'].isoformat()
        }
        
        if include_actor_name and 'actor_name' in event.keys():
            result["actor_name"] = event['actor_name']
        
        return result
