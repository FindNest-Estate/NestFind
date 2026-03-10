
import asyncio
import asyncpg
import os

async def reset_password():
    print("Attempting to connect as postgres...")
    try:
        # Try connecting as postgres without password (trust auth)
        conn = await asyncpg.connect(user='postgres', database='postgres', host='localhost')
        print("Connected as postgres!")
        
        # Reset password for nestfind_user
        print("Resetting password for nestfind_user...")
        await conn.execute("ALTER USER nestfind_user WITH PASSWORD 'your_secure_password_here';")
        print("Password reset successful.")
        
        await conn.close()
        return True
    except Exception as e:
        print(f"Failed to connect as postgres or reset password: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(reset_password())
