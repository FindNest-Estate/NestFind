
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def check_schema():
    print("Connecting...")
    try:
        conn = await asyncpg.connect(
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", 5432)
        )
    except Exception as e:
        print(f"Connect failed: {e}")
        return

    print("Checking columns...")
    rows = await conn.fetch(
        """
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'property_verifications';
        """
    )
    for r in rows:
        print(f" - {r['column_name']}")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_schema())
