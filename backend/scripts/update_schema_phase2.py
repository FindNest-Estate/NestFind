import sqlite3
import os

DB_PATH = "nestfind.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if columns exist
        cursor.execute("PRAGMA table_info(users)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "experience_years" not in columns:
            print("Adding experience_years column...")
            cursor.execute("ALTER TABLE users ADD COLUMN experience_years INTEGER DEFAULT 0")
        else:
            print("experience_years column already exists.")
            
        if "social_links" not in columns:
            print("Adding social_links column...")
            cursor.execute("ALTER TABLE users ADD COLUMN social_links JSON DEFAULT '{}'")
        else:
            print("social_links column already exists.")
            
        conn.commit()
        print("Migration successful!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
