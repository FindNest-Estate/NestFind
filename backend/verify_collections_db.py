import asyncio
import asyncpg
from app.core.database import get_db_pool, init_db_pool, close_db_pool
import os
from dotenv import load_dotenv

load_dotenv()

async def verify_collections():
    await init_db_pool()
    pool = await get_db_pool()

    print(f"Connected to DB: {os.getenv('DB_NAME')} on {os.getenv('DB_HOST')}:{os.getenv('DB_PORT')} as {os.getenv('DB_USER')}")
    
    print("Verifying Collections Schema...")
    async with pool.acquire() as conn:
        # 1. Check table existence
        table_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'collections'
            );
        """)
        print(f"Table 'collections' exists: {table_exists}")
        
        if not table_exists:
            print("ERROR: Table missing!")
            return

        # 2. Check junction table
        junction_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'collection_items'
            );
        """)
        print(f"Table 'collection_items' exists: {junction_exists}")

        # 3. Insert specific test user if not exists (for FK)
        # We need a valid user_id. Let's pick one or create dummy.
        user_id = await conn.fetchval("SELECT id FROM users LIMIT 1")
        if not user_id:
            print("No users found, creating dummy user...")
            user_id = await conn.fetchval("""
                INSERT INTO users (email, password_hash, full_name, role)
                VALUES ('test_coll@example.com', 'hash', 'Test Coll', 'buyer')
                RETURNING id
            """)
        
        print(f"Using User ID: {user_id}")

        # 4. Insert Collection
        print("Testing Insert...")
        col_id = await conn.fetchval("""
            INSERT INTO collections (user_id, name, color)
            VALUES ($1, 'Test Collection', 'blue')
            RETURNING id
        """, user_id)
        print(f"Inserted Collection ID: {col_id}")

        # 5. Verify Read
        row = await conn.fetchrow("SELECT * FROM collections WHERE id = $1", col_id)
        print(f"Read back: {row['name']} ({row['color']})")

        # 6. Cleanup
        print("Cleaning up...")
        await conn.execute("DELETE FROM collections WHERE id = $1", col_id)
        print("Deleted test collection.")

    await close_db_pool()
    print("Verification Complete.")

if __name__ == "__main__":
    asyncio.run(verify_collections())
