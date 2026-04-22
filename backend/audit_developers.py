import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    db_url = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
    conn = await asyncpg.connect(db_url)
    try:
        rows = await conn.fetch("""
            SELECT u.email, u.status as user_status, dp.status as profile_status 
            FROM users u 
            LEFT JOIN developer_profiles dp ON u.id = dp.user_id 
            WHERE u.email IN ('rahul@nestfinddevelopers.com', 'nestventures@gmail.com', 'nestventure@gmail.com')
        """)
        print("\n--- Developer Account Audit ---")
        for row in rows:
            print(f"Email: {row['email']}, User Status: {row['user_status']}, Profile Status: {row['profile_status']}")
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(check())
