import asyncio
import os
from dotenv import load_dotenv
import asyncpg
import bcrypt

load_dotenv()

# Change these to your desired admin credentials
EMAIL = "nestfind@gmail.com"
PASSWORD = "Admin@123"
FULL_NAME = "NestFind Admin"
MOBILE = "9999999999"

async def create_admin():
    print("Connecting to database...")
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
    password_bytes = PASSWORD.encode('utf-8')
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')

    print("Checking for ADMIN role...")
    role_id = await conn.fetchval("SELECT id FROM roles WHERE name = 'ADMIN'")
    if not role_id:
        print("ADMIN role not found! Creating it...")
        role_id = await conn.fetchval("INSERT INTO roles (name) VALUES ('ADMIN') RETURNING id")
        print(f"Created ADMIN role with id: {role_id}")

    print(f"Checking if user {EMAIL} exists...")
    existing_user_id = await conn.fetchval("SELECT id FROM users WHERE email = $1", EMAIL)

    if existing_user_id:
        print("User exists. Updating password and status...")
        await conn.execute("""
            UPDATE users 
            SET password_hash = $1, status = 'ACTIVE', login_attempts = 0, login_locked_until = NULL 
            WHERE id = $2
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
        print("User does not exist. Creating new admin...")
        user_id = await conn.fetchval("""
            INSERT INTO users (full_name, email, mobile_number, password_hash, status, email_verified_at)
            VALUES ($1, $2, $3, $4, 'ACTIVE', NOW())
            RETURNING id
        """, FULL_NAME, EMAIL, MOBILE, password_hash)
        
        await conn.execute("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", user_id, role_id)
        print(f"User created with id: {user_id}")

    print("\n" + "="*50)
    print("✓ Admin account ready!")
    print(f"  Email: {EMAIL}")
    print(f"  Password: {PASSWORD}")
    print("  Portal: http://localhost:3000/admin-login")
    print("="*50)
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(create_admin())
