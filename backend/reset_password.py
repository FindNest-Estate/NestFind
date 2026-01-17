"""Reset password for a user by email or ID."""
import asyncio
import asyncpg
import bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

async def reset_password(email: str, new_password: str):
    db_url = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
    
    conn = await asyncpg.connect(db_url)
    
    try:
        # Hash the new password
        password_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
        
        # Update password
        result = await conn.execute("""
            UPDATE users 
            SET password_hash = $1, login_attempts = 0, login_locked_until = NULL
            WHERE email = $2
        """, password_hash, email)
        
        print(f"✅ Password reset for: {email}")
        print(f"   New password: {new_password}")
        print(f"   Result: {result}")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    # Reset password for admin
    asyncio.run(reset_password("pk974645@gmail.com", "Admin@123"))
