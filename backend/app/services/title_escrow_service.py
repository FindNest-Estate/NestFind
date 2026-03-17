from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime
import asyncpg
from app.schemas.title_escrow_schemas import (
    TitleSearchCreate, TitleSearchUpdate,
    EscrowDisbursementCreate, EscrowDisbursementUpdate
)

class TitleEscrowService:
    def __init__(self, db: asyncpg.Pool):
        self.db = db

    async def create_title_search(self, data: TitleSearchCreate) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            try:
                row = await conn.fetchrow("""
                    INSERT INTO title_searches (transaction_id, agency_name, checker_name)
                    VALUES ($1, $2, $3)
                    RETURNING *
                """, data.transaction_id, data.agency_name, data.checker_name)
                
                return {"success": True, "title_search": dict(row)}
            except Exception as e:
                return {"success": False, "error": str(e)}

    async def update_title_search(self, id: UUID, data: TitleSearchUpdate) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            updates = []
            params = [id]
            idx = 2
            for field, value in data.dict(exclude_unset=True).items():
                updates.append(f"{field} = ${idx}")
                params.append(value)
                idx += 1
            
            if not updates:
                return {"success": False, "error": "No fields to update"}
                
            query = f"UPDATE title_searches SET {', '.join(updates)} WHERE id = $1 RETURNING *"
            row = await conn.fetchrow(query, *params)
            
            if not row:
                return {"success": False, "error": "Not found"}
                
            return {"success": True, "title_search": dict(row)}

    async def create_escrow_disbursement(self, data: EscrowDisbursementCreate) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            try:
                row = await conn.fetchrow("""
                    INSERT INTO escrow_disbursements (transaction_id, payee_id, payee_role, amount, purpose)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *
                """, data.transaction_id, data.payee_id, data.payee_role, data.amount, data.purpose)
                
                return {"success": True, "disbursement": dict(row)}
            except Exception as e:
                return {"success": False, "error": str(e)}

    async def update_escrow_disbursement(self, id: UUID, data: EscrowDisbursementUpdate) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            updates = []
            params = [id]
            idx = 2
            for field, value in data.dict(exclude_unset=True).items():
                updates.append(f"{field} = ${idx}")
                params.append(value)
                idx += 1
            
            if not updates:
                return {"success": False, "error": "No fields to update"}
                
            query = f"UPDATE escrow_disbursements SET {', '.join(updates)} WHERE id = $1 RETURNING *"
            row = await conn.fetchrow(query, *params)
            
            if not row:
                return {"success": False, "error": "Not found"}
                
            return {"success": True, "disbursement": dict(row)}

    async def get_transaction_escrow(self, transaction_id: UUID) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            title_searches = await conn.fetch("SELECT * FROM title_searches WHERE transaction_id = $1", transaction_id)
            disbursements = await conn.fetch("SELECT * FROM escrow_disbursements WHERE transaction_id = $1", transaction_id)
            
            return {
                "success": True,
                "title_searches": [dict(r) for r in title_searches],
                "disbursements": [dict(r) for r in disbursements]
            }
