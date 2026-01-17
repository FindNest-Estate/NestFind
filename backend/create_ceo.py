import asyncio
import os
from dotenv import load_dotenv
import asyncpg
from passlib.context import CryptContext

load_dotenv()

EMAIL = "pk974645@gmail.com"
PASSWORD = "Prasanna@49"
FULL_NAME = "CEO Admin" # Placeholder name
MOBILE = "9999999999" # Placeholder

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_ceo():
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

    print(f"Hashing password for {EMAIL}...")
    password_hash = pwd_context.hash(PASSWORD)

    print("Checking for ADMIN role...")
    role_id = await conn.fetchval("SELECT id FROM roles WHERE name = 'ADMIN'")
    if not role_id:
        print("ADMIN role not found! Creating it...")
        role_id = await conn.fetchval("INSERT INTO roles (name, description) VALUES ('ADMIN', 'System Administrator') RETURNING id")

    print(f"Checking if user {EMAIL} exists...")
    existing_user_id = await conn.fetchval("SELECT id FROM users WHERE email = $1", EMAIL)

    if existing_user_id:
        print("User exists. Updating password and role...")
        await conn.execute("""
            UPDATE users SET password_hash = $1, status = 'ACTIVE' WHERE id = $2
        """, password_hash, existing_user_id)
        
        # Check if already has admin role
        has_role = await conn.fetchval("""
            SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2
        """, existing_user_id, role_id)
        
        if not has_role:
            await conn.execute("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", existing_user_id, role_id)
            print("Added ADMIN role.")
        else:
            print("Already has ADMIN role.")
            
    else:
        print("User does not exist. Creating new CEO Admin...")
        user_id = await conn.fetchval("""
            INSERT INTO users (full_name, email, mobile_number, password_hash, status, is_verified)
            VALUES ($1, $2, $3, $4, 'ACTIVE', true)
            RETURNING id
        """, FULL_NAME, EMAIL, MOBILE, password_hash)
        
        await conn.execute("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", user_id, role_id)
        print("User created and assigned ADMIN role.")

    print("Done. You can now login.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(create_ceo())
