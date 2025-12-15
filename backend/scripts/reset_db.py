import os
import sys
from sqlalchemy import create_engine

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.models import User, AdminUser
from app.routers.auth import get_password_hash

DB_FILE = "nestfind.db"

def reset_database():
    print("--- RESETTING DATABASE ---")
    print(f"DB Path: {engine.url.database}")
    
    # 1. Drop all tables
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Tables dropped.")

    # 2. Create Tables
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")

    # 3. Seed Data
    db = SessionLocal()
    try:
        print("Seeding data...")
        
        # Admin
        admin_email = "nestfind@gmail.com"
        admin_pass = "123456789"
        admin = User(
            email=admin_email,
            password_hash=get_password_hash(admin_pass),
            first_name="NestFind",
            last_name="Admin",
            role="admin",
            phone="9490586840",
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        admin_entry = AdminUser(
            user_id=admin.id,
            role="super_admin",
            permissions=["*"]
        )
        db.add(admin_entry)
        db.commit() # Commit the AdminUser entry too

        # Verify insertion
        user_count = db.query(User).count()
        print(f"Total Users in DB after seed: {user_count}")
        
        created_admin = db.query(User).filter(User.email == admin_email).first()
        if created_admin:
             print(f"Verified Admin in DB: ID={created_admin.id}")
        else:
             print("CRITICAL: Admin NOT found immediately after commit!")
        
        print("--- SEEDING COMPLETE ---")
        print(f"Admin: {admin_email} / {admin_pass}")
        
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()
        
    # Verify with sqlite3 directly
    import sqlite3
    try:
        print("--- VERIFYING WITH SQLITE3 ---")
        db_path = os.path.abspath("nestfind.db")
        print(f"Checking DB file: {db_path}")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT email, role FROM users")
        rows = cursor.fetchall()
        print(f"Rows in users table: {rows}")
        conn.close()
    except Exception as e:
        print(f"Sqlite3 verification failed: {e}")

if __name__ == "__main__":
    reset_database()
