
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def run_migration():
    print("Connecting to database...")
    try:
        conn = await asyncpg.connect(
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", 5432)
        )
    except Exception as e:
        print(f"Failed to connect: {e}")
        return

    print("Connected. Reading migration file...")
    try:
        with open("migrations/004_property_verification_update.sql", "r") as f:
            sql = f.read()
    except FileNotFoundError:
        print("Migration file not found!")
        return

    print("Executing migration...")
    try:
        await conn.execute(sql)
        print("Migration applied successfully.")
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
