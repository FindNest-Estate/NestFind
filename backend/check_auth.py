
import asyncio
import asyncpg
import os

async def check_credentials(user, password, db):
    print(f"Testing connection: user={user} db={db} ...")
    try:
        conn = await asyncpg.connect(
            user=user,
            password=password,
            database=db,
            host='localhost'
        )
        print("SUCCESS! Connected.")
        await conn.close()
        return True
    except Exception as e:
        print(f"FAILED: {e}")
        return False

async def main():
    # Test 1: nestfind_auth / your_secure_password_here
    await check_credentials('nestfind_user', 'your_secure_password_here', 'nestfind_auth')
    
    # Test 2: nestfind / your_secure_password_here
    await check_credentials('nestfind_user', 'your_secure_password_here', 'nestfind')

    # Test 3: nestfind_user / nestfind_password (common default?)
    # await check_credentials('nestfind_user', 'nestfind_password', 'nestfind_auth')

if __name__ == "__main__":
    asyncio.run(main())
