import asyncio
import os
from dotenv import load_dotenv
import asyncpg

load_dotenv()

async def check_all_agents():
    try:
        conn = await asyncpg.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", "5432")),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "postgres"),
            database=os.getenv("DB_NAME", "nestfind_auth")
        )
    except Exception as e:
        print(f"Failed to connect: {e}")
        return

    query = """
    SELECT u.id, u.full_name, u.email, u.status, u.latitude, u.longitude, 
           ap.is_active, ap.kyc_status, ap.rating
    FROM users u
    JOIN agent_profiles ap ON u.id = ap.user_id
    """
    agents = await conn.fetch(query)
    
    print(f"Total agents found: {len(agents)}")
    print("-" * 80)
    for a in agents:
        print(f"Name: {a['full_name']} | Email: {a['email']}")
        print(f"User Status: {a['status']} | KYC: {a['kyc_status']} | is_active: {a['is_active']} | Rating: {a['rating']}")
        print(f"Coordinates: Lat {a['latitude']}, Lng {a['longitude']}")
        print("-" * 80)
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_all_agents())
