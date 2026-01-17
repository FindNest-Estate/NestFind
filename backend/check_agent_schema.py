import asyncpg
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def check_schema():
    # Get connection from env or use default
    db_url = os.getenv('DATABASE_URL', 'postgresql://postgres@localhost/nestfind')
    
    print(f"Connecting to: {db_url}")
    
    conn = await asyncpg.connect(db_url)
    
    # Query column information
    columns = await conn.fetch("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'agent_profiles'
        ORDER BY ordinal_position
    """)
    
    print("\nColumns in agent_profiles table:")
    print("-" * 60)
    for col in columns:
        print(f"{col['column_name']:30} {col['data_type']:20} {'NULL' if col['is_nullable'] == 'YES' else 'NOT NULL'}")
    
    # Try to select from agent_profiles to confirm
    try:
        result = await conn.fetchrow("SELECT * FROM agent_profiles LIMIT 1")
        if result:
            print(f"\nSample row keys: {list(result.keys())}")
        else:
            print("\nNo rows in agent_profiles table")
    except Exception as e:
        print(f"\nError selecting from table: {e}")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_schema())
