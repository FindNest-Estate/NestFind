import asyncio
import asyncpg
import json
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    database_url = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', 5432)}/{os.getenv('DB_NAME')}"
    conn = await asyncpg.connect(database_url)
    projects = await conn.fetch("SELECT id, project_name, created_at FROM dev_projects WHERE project_name = 'Urban Planning Layout Demo' ORDER BY created_at DESC")
    
    print(f"Found {len(projects)} demo projects:")
    for p in projects:
        count = await conn.fetchval("SELECT count(*) FROM dev_layout_polygons WHERE project_id = $1", p['id'])
        print(f"ID: {p['id']}, Created: {p['created_at']}, Polygons: {count}")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check())
