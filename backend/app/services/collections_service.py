import asyncpg
from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException

from app.core.database import get_db_pool
from app.schemas.collection_schemas import CollectionCreate, CollectionUpdate, CollectionResponse

class CollectionsService:
    @staticmethod
    async def create_collection(user_id: UUID, collection: CollectionCreate) -> CollectionResponse:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            try:
                row = await conn.fetchrow("""
                    INSERT INTO collections (user_id, name, color)
                    VALUES ($1, $2, $3)
                    RETURNING id, user_id, name, color, created_at, updated_at
                """, user_id, collection.name, collection.color)
                
                return CollectionResponse(**dict(row), property_count=0)
            except asyncpg.UniqueViolationError:
                raise HTTPException(status_code=400, detail=f"Collection '{collection.name}' already exists")

    @staticmethod
    async def get_user_collections(user_id: UUID) -> List[CollectionResponse]:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT 
                    c.id, c.user_id, c.name, c.color, c.created_at, c.updated_at,
                    COUNT(ci.saved_property_id) as property_count
                FROM collections c
                LEFT JOIN collection_items ci ON c.id = ci.collection_id
                WHERE c.user_id = $1
                GROUP BY c.id
                ORDER BY c.created_at ASC
            """, user_id)
            
            return [CollectionResponse(**dict(row)) for row in rows]

    @staticmethod
    async def update_collection(user_id: UUID, collection_id: UUID, update_data: CollectionUpdate) -> CollectionResponse:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # First check ownership
            exists = await conn.fetchval(
                "SELECT 1 FROM collections WHERE id = $1 AND user_id = $2", 
                collection_id, user_id
            )
            if not exists:
                raise HTTPException(status_code=404, detail="Collection not found")

            # Build update query dynamically
            fields = []
            values = []
            idx = 1
            
            if update_data.name is not None:
                fields.append(f"name = ${idx}")
                values.append(update_data.name)
                idx += 1
                
            if update_data.color is not None:
                fields.append(f"color = ${idx}")
                values.append(update_data.color)
                idx += 1
                
            if not fields:
                # Nothing to update, fetch and return
                row = await conn.fetchrow(
                    "SELECT * FROM collections WHERE id = $1", 
                    collection_id
                )
                # create stub object to get property count
                item_count = await conn.fetchval(
                    "SELECT COUNT(*) FROM collection_items WHERE collection_id = $1",
                    collection_id
                )
                return CollectionResponse(**dict(row), property_count=item_count)

            fields.append(f"updated_at = NOW()")
            values.append(collection_id) # Last arg is ID for WHERE clause
            
            query = f"""
                UPDATE collections 
                SET {", ".join(fields)}
                WHERE id = ${idx}
                RETURNING id, user_id, name, color, created_at, updated_at
            """
            
            try:
                row = await conn.fetchrow(query, *values)
                
                item_count = await conn.fetchval(
                    "SELECT COUNT(*) FROM collection_items WHERE collection_id = $1",
                    collection_id
                )
                
                return CollectionResponse(**dict(row), property_count=item_count)
            except asyncpg.UniqueViolationError:
                raise HTTPException(status_code=400, detail="Collection name already exists")

    @staticmethod
    async def delete_collection(user_id: UUID, collection_id: UUID):
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            result = await conn.execute(
                "DELETE FROM collections WHERE id = $1 AND user_id = $2",
                collection_id, user_id
            )
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="Collection not found")
            return {"success": True}

    @staticmethod
    async def add_property_to_collection(user_id: UUID, collection_id: UUID, property_id: UUID):
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # 1. Verify collection ownership
            collection_exists = await conn.fetchval(
                "SELECT 1 FROM collections WHERE id = $1 AND user_id = $2",
                collection_id, user_id
            )
            if not collection_exists:
                raise HTTPException(status_code=404, detail="Collection not found")
            
            # 2. Get saved_property_id for this property/user combo
            # If property isn't saved yet, save it implicitly? 
            # For now, assume it must be saved first.
            saved_id = await conn.fetchval("""
                SELECT id FROM saved_properties 
                WHERE user_id = $1 AND property_id = $2
            """, user_id, property_id)
            
            if not saved_id:
                # Logic: Auto-save the property if trying to add to collection
                saved_id = await conn.fetchval("""
                    INSERT INTO saved_properties (user_id, property_id)
                    VALUES ($1, $2)
                    ON CONFLICT (user_id, property_id) DO UPDATE SET created_at = NOW()
                    RETURNING id
                """, user_id, property_id)

            # 3. Insert into junction
            try:
                await conn.execute("""
                    INSERT INTO collection_items (collection_id, saved_property_id)
                    VALUES ($1, $2)
                    ON CONFLICT DO NOTHING
                """, collection_id, saved_id)
            except Exception as e:
                # Should not happen due to ON CONFLICT
                print(e)
                pass

            return {"success": True}

    @staticmethod
    async def remove_property_from_collection(user_id: UUID, collection_id: UUID, property_id: UUID):
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # Get saved_property_id
            saved_id = await conn.fetchval("""
                SELECT id FROM saved_properties 
                WHERE user_id = $1 AND property_id = $2
            """, user_id, property_id)
            
            if not saved_id:
                return {"success": True} # Already gone

            # Delete map, checking collection ownership via join or subquery
            # Simpler: just check ownership first
            is_owner = await conn.fetchval(
                "SELECT 1 FROM collections WHERE id = $1 AND user_id = $2",
                collection_id, user_id
            )
            if not is_owner:
                 raise HTTPException(status_code=404, detail="Collection not found")

            await conn.execute("""
                DELETE FROM collection_items 
                WHERE collection_id = $1 AND saved_property_id = $2
            """, collection_id, saved_id)
            
            return {"success": True}
