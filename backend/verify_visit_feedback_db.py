import asyncio
import asyncpg
from app.core.database import get_db_pool, init_db_pool, close_db_pool
import os
from dotenv import load_dotenv

load_dotenv()

async def verify_feedback_table():
    await init_db_pool()
    pool = await get_db_pool()
    
    print(f"Connected to DB: {os.getenv('DB_NAME')} on {os.getenv('DB_HOST')}:{os.getenv('DB_PORT')} as {os.getenv('DB_USER')}")
    print("Verifying visit_feedback_buyer Schema...")
    
    async with pool.acquire() as conn:
        # 1. Check table existence
        table_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'visit_feedback_buyer'
            );
        """)
        print(f"Table 'visit_feedback_buyer' exists: {table_exists}")
        
        if not table_exists:
            print("ERROR: Table missing!")
            await close_db_pool()
            return

        # 2. Check columns
        columns = await conn.fetch("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'visit_feedback_buyer'
            ORDER BY ordinal_position
        """)
        
        print("\nTable Columns:")
        for col in columns:
            print(f"  - {col['column_name']}: {col['data_type']}")

        print("\n✅ Schema verification complete!")

    await close_db_pool()

if __name__ == "__main__":
    asyncio.run(verify_feedback_table())
