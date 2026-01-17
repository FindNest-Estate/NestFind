import asyncio
import os
from dotenv import load_dotenv
import asyncpg
from uuid import UUID

load_dotenv()

PROPERTY_ID = "52b64086-2efa-4fac-aff7-73373d308605"

def log(msg):
    with open("debug_log.txt", "a") as f:
        f.write(msg + "\n")
    print(msg)

async def debug():
    # Clear previous log
    with open("debug_log.txt", "w") as f:
        f.write("Debug Log:\n")

    log("Connecting to database...")
    try:
        conn = await asyncpg.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", "5432")),
            user=os.getenv("DB_USER", "nestfind_user"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME", "nestfind_auth")
        )
    except Exception as e:
        log(f"Failed to connect: {e}")
        return

    log(f"\n--- Checking Property {PROPERTY_ID} ---")
    prop = await conn.fetchrow("SELECT * FROM properties WHERE id = $1", UUID(PROPERTY_ID))
    if prop:
        log(f"Status: {prop['status']}")
        log(f"Title: {prop['title']}")
        log(f"Type: {prop['type']}")
        log(f"Price: {prop['price']}")
        log(f"City: {prop['city']}")
        
        required = ["title", "type", "price", "city"]
        missing = [f for f in required if not prop[f]]
        if missing:
            log(f"MISSING FIELDS: {missing}")
        else:
            log("All required fields present.")
    else:
        log("Property NOT FOUND")

    log("\n--- Checking Available Agents ---")
    agents = await conn.fetch("""
        SELECT u.id, u.full_name, u.email, u.status 
        FROM users u 
        JOIN agent_profiles ap ON u.id = ap.user_id
        WHERE u.status = 'ACTIVE'
    """)
    
    log(f"Found {len(agents)} active agents:")
    for a in agents:
        log(f"- {a['full_name']} ({a['email']}) [Status: {a['status']}]")
        
    if not agents:
        log("NO ACTIVE AGENTS FOUND! This will cause 400 error.")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(debug())
