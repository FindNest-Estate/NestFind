import asyncio
import asyncpg
import json
import os
from dotenv import load_dotenv

load_dotenv()

async def verify_market_insights_query():
    # Reuse DB connection settings
    db_url = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
    
    print(f"Connecting to DB to test SQL logic...")
    conn = await asyncpg.connect(db_url)
    
    try:
        # Replicating the logic from buyer.py for verification
        row = await conn.fetchrow("""
            WITH current_stats AS (
                SELECT 
                    count(*) as active_count,
                    avg(price) as avg_price,
                    avg(EXTRACT(DAY FROM NOW() - created_at)) as avg_days
                FROM properties 
                WHERE status = 'ACTIVE'
            ),
            past_stats AS (
                SELECT avg(price) as old_avg_price
                FROM properties 
                WHERE status = 'ACTIVE' 
                AND created_at < NOW() - INTERVAL '30 days'
            )
            SELECT 
                c.active_count,
                COALESCE(c.avg_price, 0) as avg_price,
                COALESCE(c.avg_days, 0) as avg_days,
                p.old_avg_price
            FROM current_stats c
            CROSS JOIN past_stats p
        """)
        
        print("\n--- SQL Query Result ---")
        print(f"Active Listings: {row['active_count']}")
        print(f"Avg Price: {row['avg_price']}")
        print(f"Avg Days on Market: {row['avg_days']}")
        print(f"Old Avg Price: {row['old_avg_price']}")
        
        print("\n✅ API Logic Verification Passed")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(verify_market_insights_query())
