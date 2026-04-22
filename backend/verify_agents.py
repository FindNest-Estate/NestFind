import asyncio
import os
from dotenv import load_dotenv
import asyncpg

load_dotenv()

async def verify_agents():
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
    UPDATE agent_profiles
    SET kyc_status = 'VERIFIED'
    WHERE kyc_status != 'VERIFIED'
    """
    result = await conn.execute(query)
    
    print(f"Updated KYC status: {result}")
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(verify_agents())
