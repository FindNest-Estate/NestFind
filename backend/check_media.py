"""Check property media records."""
import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect(
        user="postgres", password="prasanna",
        database="nestfind_auth", host="localhost"
    )
    
    count = await conn.fetchval("SELECT COUNT(*) FROM property_media")
    print(f"Total property_media records: {count}")
    
    rows = await conn.fetch("""
        SELECT p.title, pm.file_url 
        FROM property_media pm 
        JOIN properties p ON pm.property_id = p.id 
        WHERE pm.is_primary = true
        LIMIT 5
    """)
    
    for r in rows:
        print(f"  - {r['title']}: {r['file_url'][:50]}...")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check())
