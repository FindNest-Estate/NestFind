import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Add backend to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__)))

from app.core.database import init_db_pool, get_db_pool

async def main():
    await init_db_pool()
    pool = get_db_pool()
    async with pool.acquire() as conn:
        print("Checking audit_logs columns:")
        cols = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'audit_logs'")
        for c in cols:
            print(f"- {c['column_name']} ({c['data_type']})")

if __name__ == "__main__":
    asyncio.run(main())
