import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def fix_users():
    db_url = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
    conn = await asyncpg.connect(db_url)
    
    try:
        # Get users WITHOUT roles
        users = await conn.fetch("""
            SELECT id, email 
            FROM users 
            WHERE id NOT IN (SELECT user_id FROM user_roles)
        """)
        
        if not users:
            print("No users without roles found.")
            return

        print(f"Found {len(users)} users without roles. Starting fix...")

        # Get role IDs
        buyer_role = await conn.fetchrow("SELECT id FROM roles WHERE name = 'BUYER'")
        dev_role = await conn.fetchrow("SELECT id FROM roles WHERE name = 'DEVELOPER'")

        if not buyer_role or not dev_role:
            print("Error: BUYER or DEVELOPER role missing in database.")
            return

        for user in users:
            # Check if user has a developer profile
            has_profile = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM developer_profiles WHERE user_id = $1)",
                user['id']
            )

            target_role_id = dev_role['id'] if has_profile else buyer_role['id']
            role_name = "DEVELOPER" if has_profile else "BUYER"

            print(f"Assigning {role_name} role to {user['email']}...")
            
            await conn.execute(
                """
                INSERT INTO user_roles (user_id, role_id)
                VALUES ($1, $2) ON CONFLICT DO NOTHING
                """,
                user['id'], target_role_id
            )

        print("Fix completed successfully.")

    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(fix_users())
