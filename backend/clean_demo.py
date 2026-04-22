import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def clean():
    database_url = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', 5432)}/{os.getenv('DB_NAME')}"
    conn = await asyncpg.connect(database_url)
    
    # Delete projects named 'Urban Planning Layout Demo' that have ZERO polygons
    deleted = await conn.execute("""
        DELETE FROM dev_projects 
        WHERE project_name = 'Urban Planning Layout Demo' 
        AND id NOT IN (SELECT CAST(project_id AS UUID) FROM dev_layout_polygons)
    """)
    print(f"Cleaned up empty projects: {deleted}")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(clean())
