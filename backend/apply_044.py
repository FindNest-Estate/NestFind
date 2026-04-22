import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect("postgresql://nestfind_user:your_secure_password_here@localhost:5432/nestfind_auth")
    with open("migrations/044_visualization_engine.sql", "r", encoding="utf-8") as f:
        sql = f.read()
    await conn.execute(sql)
    await conn.close()
    print("Migration applied successfully.")

asyncio.run(main())
