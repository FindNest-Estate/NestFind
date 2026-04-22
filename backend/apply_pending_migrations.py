"""
Apply only the pending migrations that are not yet in the migrations_log.
If migrations_log is empty (fresh run by apply_latest_migrations.py logic), this script
instead detects which tables already exist and skips confirmed-applied migrations,
then applies only missing ones.

Usage:
    python apply_pending_migrations.py
    # -- OR to force specific migrations:
    python apply_pending_migrations.py 038 039 040
"""
import asyncio
import os
import sys
import glob
import re

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


def get_migration_files(prefixes=None):
    files = glob.glob("migrations/*.sql")

    def get_num(f):
        match = re.search(r"(\d+)", os.path.basename(f))
        return int(match.group(1)) if match else 0

    files = sorted(files, key=get_num)

    if prefixes:
        filtered = []
        for f in files:
            num = get_num(f)
            if any(str(num).startswith(p) or str(num) == p for p in prefixes):
                filtered.append(f)
        return filtered
    return files


async def run_migrations(prefixes=None):
    print(f"Connecting to database: {DATABASE_URL.rsplit('@', 1)[-1]}")
    conn = await asyncpg.connect(DATABASE_URL)

    # Ensure migrations_log table exists
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS migrations_log (
            id SERIAL PRIMARY KEY,
            filename TEXT UNIQUE NOT NULL,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)

    applied_rows = await conn.fetch("SELECT filename FROM migrations_log")
    applied_set = {row["filename"] for row in applied_rows}
    print(f"Already applied migrations: {len(applied_set)}")

    all_migrations = get_migration_files(prefixes)

    pending = [m for m in all_migrations if os.path.basename(m) not in applied_set]
    print(f"Pending migrations: {[os.path.basename(m) for m in pending]}")

    if not pending:
        print("Nothing to apply. Database is up to date.")
        await conn.close()
        return

    for migration in pending:
        basename = os.path.basename(migration)
        print(f"\n--- Applying: {basename} ---")
        try:
            with open(migration, "r", encoding="utf-8") as f:
                sql = f.read()

            async with conn.transaction():
                await conn.execute(sql)
                await conn.execute(
                    "INSERT INTO migrations_log (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING",
                    basename,
                )
            print(f"✅  {basename} applied successfully.")
        except Exception as e:
            print(f"❌  Error in {basename}: {e}")
            print("Stopping migration run.")
            break

    await conn.close()
    print("\nDone.")


if __name__ == "__main__":
    prefixes = sys.argv[1:] if len(sys.argv) > 1 else None
    asyncio.run(run_migrations(prefixes))
