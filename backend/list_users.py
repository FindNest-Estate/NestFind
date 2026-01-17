"""List users by role from the database."""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def list_users():
    db_url = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
    
    conn = await asyncpg.connect(db_url)
    
    try:
        rows = await conn.fetch("""
            SELECT u.id, u.full_name, u.email, r.name as role, u.status, u.created_at 
            FROM users u 
            JOIN user_roles ur ON u.id = ur.user_id 
            JOIN roles r ON ur.role_id = r.id 
            ORDER BY r.name, u.created_at DESC
        """)
        
        print(f"\n{'='*100}")
        print(f"{'ID':<40} {'Name':<20} {'Email':<30} {'Role':<10} {'Status':<15}")
        print(f"{'='*100}")
        
        for row in rows:
            print(f"{str(row['id']):<40} {row['full_name'][:18]:<20} {row['email'][:28]:<30} {row['role']:<10} {row['status']:<15}")
        
        print(f"\n Total: {len(rows)} users")
        
        # Count by role
        counts = await conn.fetch("""
            SELECT r.name as role, COUNT(*) as count
            FROM users u 
            JOIN user_roles ur ON u.id = ur.user_id 
            JOIN roles r ON ur.role_id = r.id 
            GROUP BY r.name
        """)
        
        print("\n📊 Users per role:")
        for row in counts:
            print(f"  {row['role']}: {row['count']}")
            
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(list_users())
