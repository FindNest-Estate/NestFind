import asyncio
import asyncpg
from uuid import UUID

PROPERTY_ID = "52b64086-2efa-4fac-aff7-73373d308605"

async def verify_data():
    conn = await asyncpg.connect(
        user="postgres",
        password="prasanna",
        database="nestfind_auth",
        host="localhost"
    )
    
    try:
        print(f"Checking data for {PROPERTY_ID} in nestfind_auth...")
        
        # Check Highlights
        row = await conn.fetchrow("SELECT * FROM property_highlights WHERE property_id = $1", UUID(PROPERTY_ID))
        if row:
            print("✅ Found Highlights Row:")
            print(dict(row))
        else:
            print("❌ No Highlights Row found!")

        # Check Price History
        rows = await conn.fetch("SELECT * FROM property_price_history WHERE property_id = $1", UUID(PROPERTY_ID))
        print(f"✅ Found {len(rows)} Price History rows")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(verify_data())
