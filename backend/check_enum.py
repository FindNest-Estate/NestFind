"""
Diagnostic script to check visit_status enum values in the database.
Uses the same connection settings as the main application.
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def check_enum():
    # Use same connection string as the app
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/nestfind")
    
    print(f"Connecting to: {database_url}")
    
    conn = await asyncpg.connect(database_url)
    
    try:
        # Check enum values
        rows = await conn.fetch("""
            SELECT enumlabel 
            FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'visit_status')
            ORDER BY enumsortorder
        """)
        
        print("\nCurrent visit_status enum values:")
        for row in rows:
            print(f"  - {row['enumlabel']}")
        
        # Check if COUNTERED exists
        labels = [row['enumlabel'] for row in rows]
        if 'COUNTERED' in labels:
            print("\n✅ COUNTERED exists in the enum")
        else:
            print("\n❌ COUNTERED is MISSING from the enum!")
            print("\nTo fix, run this SQL:")
            print("  ALTER TYPE visit_status ADD VALUE 'COUNTERED';")
            
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check_enum())
