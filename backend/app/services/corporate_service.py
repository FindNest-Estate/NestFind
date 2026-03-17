from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime
import asyncpg
from app.schemas.corporate_schemas import (
    CorporateInventoryCreate, CorporateInventoryUpdate,
    RenovationLedgerCreate, RenovationLedgerUpdate
)

class CorporateInventoryService:
    def __init__(self, db: asyncpg.Pool):
        self.db = db

    async def create_inventory(self, data: CorporateInventoryCreate) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            try:
                row = await conn.fetchrow("""
                    INSERT INTO corporate_inventory (property_id, purchase_deal_id, purchase_price, estimated_renovation_budget, target_resale_price)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *
                """, data.property_id, data.purchase_deal_id, data.purchase_price, data.estimated_renovation_budget, data.target_resale_price)
                
                return {"success": True, "inventory": dict(row)}
            except Exception as e:
                return {"success": False, "error": str(e)}

    async def get_inventory(self, id: UUID) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM corporate_inventory WHERE id = $1", id)
            if not row:
                return {"success": False, "error": "Not found"}
            return {"success": True, "inventory": dict(row)}

    async def update_inventory(self, id: UUID, data: CorporateInventoryUpdate) -> Dict[str, Any]:
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
                
            query = f"UPDATE corporate_inventory SET {', '.join(updates)} WHERE id = $1 RETURNING *"
            row = await conn.fetchrow(query, *params)
            
            if not row:
                return {"success": False, "error": "Not found"}
                
            return {"success": True, "inventory": dict(row)}

    # Renovation Ledger Methods
    async def add_renovation_ledger(self, data: RenovationLedgerCreate) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            try:
                row = await conn.fetchrow("""
                    INSERT INTO renovation_ledgers (inventory_id, contractor_id, amount, description)
                    VALUES ($1, $2, $3, $4)
                    RETURNING *
                """, data.inventory_id, data.contractor_id, data.amount, data.description)
                return {"success": True, "ledger": dict(row)}
            except Exception as e:
                return {"success": False, "error": str(e)}

    async def get_renovation_ledgers(self, inventory_id: UUID) -> Dict[str, Any]:
        async with self.db.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM renovation_ledgers WHERE inventory_id = $1 ORDER BY created_at DESC", inventory_id)
            return {"success": True, "ledgers": [dict(r) for r in rows]}
