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

async def run_migration():
    print(f"Connecting to database...")
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            with open("migrations/020_seller_settings.sql", "r") as f:
                sql = f.read()
                print("Executing migration...")
                await conn.execute(sql)
                print("Migration 020_seller_settings applied successfully.")
        except Exception as e:
            print(f"Error executing SQL: {e}")
        finally:
            await conn.close()
    except Exception as e:
        print(f"Error connecting to DB: {e}")

if __name__ == "__main__":
    asyncio.run(run_migration())
