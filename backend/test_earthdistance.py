import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "postgres")
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

async def run_migrations():
    print(f"Connecting to database...")
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        print("Executing CREATE EXTENSION cube...")
        await conn.execute("CREATE EXTENSION IF NOT EXISTS cube;")
        print("Executing CREATE EXTENSION earthdistance...")
        await conn.execute("CREATE EXTENSION IF NOT EXISTS earthdistance;")
        print("Success.")
        await conn.close()
    except Exception as e:
        print(f"Error connecting to DB or executing: {e}")

if __name__ == "__main__":
    asyncio.run(run_migrations())
