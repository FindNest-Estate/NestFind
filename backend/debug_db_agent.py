import asyncio
import os
from dotenv import load_dotenv
import asyncpg
import uuid

load_dotenv()

AGENT_ID = "76ff86c6-3728-4fa8-b56d-0f83ef25468b"

async def debug_agent():
    print(f"Connecting to DB to check agent {AGENT_ID}...")
    try:
        conn = await asyncpg.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", "5432")),
            user=os.getenv("DB_USER", "nestfind_user"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME", "nestfind_auth")
        )
    except Exception as e:
        print(f"Failed to connect: {e}")
        return

    # 1. Check if user exists
    user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", uuid.UUID(AGENT_ID))
    if user:
        print(f"User FOUND: {user['email']}, Status: {user['status']}")
    else:
        print("User NOT FOUND in users table.")

    # 2. Check roles
    roles = await conn.fetch("SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1", uuid.UUID(AGENT_ID))
    print(f"Roles: {[r['name'] for r in roles]}")

    # 3. Check agent profile
    profile = await conn.fetchrow("SELECT * FROM agent_profiles WHERE user_id = $1", uuid.UUID(AGENT_ID))
    if profile:
        print("Agent Profile FOUND.")
        print(dict(profile))
    else:
        print("Agent Profile NOT FOUND.")
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(debug_agent())
