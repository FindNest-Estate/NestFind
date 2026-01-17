import asyncio
import asyncpg
from uuid import UUID

PROPERTY_ID = "52b64086-2efa-4fac-aff7-73373d308605"

async def seed_data():
    conn = await asyncpg.connect(
        user="postgres",
        password="prasanna",
        database="nestfind_auth",
        host="localhost"
    )
    
    try:
        print(f"Seeding data for property {PROPERTY_ID}...")
        
        # 1. Insert/Update Highlights
        await conn.execute("""
            INSERT INTO property_highlights 
            (property_id, facing, floor_number, total_floors, furnishing, possession_date, property_age, parking_spaces, balconies)
            VALUES ($1, 'North-East', 5, 12, 'Semi-Furnished', '2024-12-01', 2, 1, 2)
            ON CONFLICT (property_id) DO UPDATE SET
                facing = EXCLUDED.facing,
                floor_number = EXCLUDED.floor_number,
                furnishing = EXCLUDED.furnishing
        """, UUID(PROPERTY_ID))
        print("✅ Highlights inserted.")

        # 2. Insert Price History
        # Clear existing to avoid dupes for this demo
        await conn.execute("DELETE FROM property_price_history WHERE property_id = $1", UUID(PROPERTY_ID))
        
        await conn.execute("""
            INSERT INTO property_price_history (property_id, old_price, new_price, changed_at)
            VALUES 
            ($1, 8500000, 8200000, NOW() - INTERVAL '60 days'),
            ($1, 8200000, 8000000, NOW() - INTERVAL '30 days'),
            ($1, 8000000, 7850000, NOW() - INTERVAL '5 days')
        """, UUID(PROPERTY_ID))
        print("✅ Price history inserted.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
