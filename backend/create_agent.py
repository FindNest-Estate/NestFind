import asyncio
import os
from dotenv import load_dotenv
import asyncpg
from uuid import uuid4

load_dotenv()

# Password hash for "password"
PASSWORD_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4h./.Sg.C"

async def create_agent():
    print("Connecting...")
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
    
    print("Finding AGENT role...")
    role_id = await conn.fetchval("SELECT id FROM roles WHERE name = 'AGENT'")
    if not role_id:
        print("AGENT role not found!")
        await conn.close()
        return

    # Check if user exists
    existing = await conn.fetchval("SELECT id FROM users WHERE email = 'alice@nestfind.com'")
    if existing:
        print("Agent alice@nestfind.com already exists.")
        await conn.close()
        return

    print("Creating Agent User...")
    try:
        user_id = await conn.fetchval("""
            INSERT INTO users (full_name, email, mobile_number, password_hash, status, is_verified)
            VALUES ('Alice Agent', 'alice@nestfind.com', '9876543210', $1, 'ACTIVE', true)
            RETURNING id
        """, PASSWORD_HASH)
        
        print(f"Assigning role AGENT to user {user_id}...")
        await conn.execute("""
            INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)
        """, user_id, role_id)
        
        print("Creating Agent Profile...")
        await conn.execute("""
            INSERT INTO agent_profiles (user_id, license_number, years_experience, bio, service_area_pincodes, verification_status)
            VALUES ($1, 'LICENSE-12345', 5, 'Expert local agent ready to help.', '{"522403"}', 'VERIFIED')
        """, user_id)
        
        print("Agent created successfully!")
        print("Email: alice@nestfind.com")
        print("Password: password")
        
    except Exception as e:
        print(f"Error creating agent: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(create_agent())
