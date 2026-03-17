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

migrations = [
    "migrations/034_timestamp_modernization.sql",
    "migrations/035_postgis_integration.sql",
    "migrations/036_corporate_inventory_schema.sql",
    "migrations/037_title_escrow_workflow.sql"
]

async def run_migrations():
    print(f"Connecting to database...")
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        for migration in migrations:
            try:
                with open(migration, "r") as f:
                    sql = f.read()
                    print(f"Executing migration: {migration}...")
                    await conn.execute(sql)
                    print(f"Migration {migration} applied successfully.")
            except Exception as e:
                print(f"Error executing {migration}: {e}")
                break
        await conn.close()
    except Exception as e:
        print(f"Error connecting to DB: {e}")

if __name__ == "__main__":
    asyncio.run(run_migrations())
