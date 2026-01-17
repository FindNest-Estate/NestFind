"""Unlock a user account and reset login attempts."""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def unlock_account(email: str):
    db_url = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
    
    conn = await asyncpg.connect(db_url)
    
    try:
        # Reset login attempts and unlock
        result = await conn.execute("""
            UPDATE users 
            SET login_attempts = 0, login_locked_until = NULL 
            WHERE email = $1
        """, email)
        
        print(f"✅ Account unlocked for: {email}")
        print(f"   Result: {result}")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    # Unlock this account
    asyncio.run(unlock_account("holywar.get@gmail.com"))
