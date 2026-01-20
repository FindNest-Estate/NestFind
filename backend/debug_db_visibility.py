import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def debug_visibility():
    db_url = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
    print(f"Connecting to: {db_url.replace(os.getenv('DB_PASSWORD'), '***')}")
    
    try:
        conn = await asyncpg.connect(db_url)
    except Exception as e:
        print(f"Connection Failed: {e}")
        return

    try:
        # 1. Who am I?
        user, db = await conn.fetchrow("SELECT current_user, current_database()")
        print(f"User: {user}, Database: {db}")

        # 2. Search Path
        search_path = await conn.fetchval("SHOW search_path")
        print(f"Search Path: {search_path}")

        # 3. List tables in public
        print("\n--- Visible Tables in 'public' ---")
        rows = await conn.fetch("""
            SELECT table_name, tableowner 
            FROM pg_tables 
            WHERE schemaname = 'public'
        """)
        for r in rows:
            print(f" - {r['table_name']} (Owner: {r['tableowner']})")

        # 4. Check information_schema specifically for collections
        print("\n--- Info Schema check for 'collections' ---")
        rows = await conn.fetch("""
             SELECT table_schema, table_name 
             FROM information_schema.tables 
             WHERE table_name = 'collections'
        """)
        for r in rows:
            print(f"Found in: {r['table_schema']}")
        
        if not rows:
            print("NOT FOUND in information_schema")

        # 5. Direct SELECT attempt
        print("\n--- Direct SELECT Check ---")
        try:
            await conn.fetchval("SELECT count(*) FROM collections")
            print("SUCCESS: Able to SELECT from collections")
        except Exception as e:
            print(f"FAILURE: {e}")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(debug_visibility())
