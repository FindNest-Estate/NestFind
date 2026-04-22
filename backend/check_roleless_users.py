import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    db_url = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
    conn = await asyncpg.connect(db_url)
    try:
        rows = await conn.fetch("SELECT id, email, status FROM users WHERE id NOT IN (SELECT user_id FROM user_roles)")
        print("\n--- Users WITHOUT roles ---")
        for row in rows:
            print(f"ID: {row['id']}, Email: {row['email']}, Status: {row['status']}")
        print(f"Total: {len(rows)}")
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(check())
