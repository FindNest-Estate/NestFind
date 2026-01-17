"""
Seed property media (images) for all properties that don't have images.
Uses free Unsplash images that will be stored as proper database records.
"""
import asyncio
import asyncpg
import random

# Sample property images from Unsplash (free to use)
PROPERTY_IMAGES = [
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&h=600&fit=crop",
]

async def seed_property_images():
    conn = await asyncpg.connect(
        user="postgres",
        password="prasanna",
        database="nestfind_auth",
        host="localhost"
    )
    
    try:
        # Get all properties without images
        properties = await conn.fetch("""
            SELECT p.id, p.title
            FROM properties p
            WHERE NOT EXISTS (
                SELECT 1 FROM property_media pm 
                WHERE pm.property_id = p.id AND pm.deleted_at IS NULL
            )
            AND p.deleted_at IS NULL
        """)
        
        if not properties:
            print("✅ All properties already have images!")
            return
        
        print(f"Found {len(properties)} properties without images. Seeding...")
        
        for prop in properties:
            # Pick a random image
            image_url = random.choice(PROPERTY_IMAGES)
            
            # Insert primary image
            await conn.execute("""
                INSERT INTO property_media (property_id, file_url, media_type, is_primary, display_order)
                VALUES ($1, $2, 'IMAGE', true, 1)
            """, prop['id'], image_url)
            
            print(f"✅ Added image for: {prop['title'] or prop['id']}")
        
        print(f"\n🎉 Successfully seeded images for {len(properties)} properties!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(seed_property_images())
