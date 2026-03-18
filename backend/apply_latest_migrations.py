import asyncio
import os
import asyncpg
import glob
import re
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

def get_migration_files():
    files = glob.glob("migrations/*.sql")
    # Sort files by the numeric prefix
    def get_num(f):
        match = re.search(r"(\d+)", os.path.basename(f))
        return int(match.group(1)) if match else 0
    return sorted(files, key=get_num)

async def run_migrations():
    print(f"Connecting to database...")
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        
        # Ensure migrations_log table exists
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS migrations_log (
                id SERIAL PRIMARY KEY,
                filename TEXT UNIQUE NOT NULL,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)

        # Get already applied migrations
        applied_rows = await conn.fetch("SELECT filename FROM migrations_log")
        applied_set = {row["filename"] for row in applied_rows}

        all_migrations = get_migration_files()
        
        for migration in all_migrations:
            basename = os.path.basename(migration)
            if basename in applied_set:
                print(f"Skipping already applied migration: {basename}")
                continue

            try:
                with open(migration, "r") as f:
                    sql = f.read()
                    print(f"Executing migration: {basename}...")
                    
                    # Execute migration and log it in the same transaction
                    async with conn.transaction():
                        await conn.execute(sql)
                        await conn.execute(
                            "INSERT INTO migrations_log (filename) VALUES ($1)", 
                            basename
                        )
                    print(f"Migration {basename} applied successfully.")
            except Exception as e:
                print(f"Error executing {basename}: {e}")
                # We stop on error to maintain sequence
                break
                
        await conn.close()
    except Exception as e:
        print(f"Error connecting to DB: {e}")

if __name__ == "__main__":
    asyncio.run(run_migrations())
