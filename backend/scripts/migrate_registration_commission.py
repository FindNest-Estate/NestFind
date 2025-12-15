import sqlite3
from datetime import datetime

def migrate_db():
    db_path = "nestfind.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 1. Update 'offers' table
        print("Migrating 'offers' table...")
        columns_to_add = [
            ("registration_slot_proposed", "DATETIME"),
            ("registration_slot_accepted", "BOOLEAN DEFAULT 0"),
            ("registration_slot_final", "DATETIME"),
            ("registration_otp", "VARCHAR"),
            ("registration_verified_at", "DATETIME"),
            ("registration_location_lat", "FLOAT"),
            ("registration_location_lng", "FLOAT"),
            ("final_registration_doc_url", "VARCHAR"),
            ("admin_doc_verified", "BOOLEAN DEFAULT 0")
        ]
        
        cursor.execute("PRAGMA table_info(offers)")
        existing_cols = [col[1] for col in cursor.fetchall()]
        
        for col_name, col_type in columns_to_add:
            if col_name not in existing_cols:
                print(f"Adding column '{col_name}'...")
                cursor.execute(f"ALTER TABLE offers ADD COLUMN {col_name} {col_type}")
            else:
                print(f"Column '{col_name}' already exists.")

        # 2. Create 'commission_payouts' table
        print("Creating 'commission_payouts' table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS commission_payouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                offer_id INTEGER NOT NULL REFERENCES offers(id),
                total_commission_received FLOAT NOT NULL,
                agent_payout_amount FLOAT NOT NULL,
                platform_revenue_amount FLOAT NOT NULL,
                status VARCHAR DEFAULT 'PENDING',
                transaction_reference VARCHAR,
                disbursed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        print("Migration completed successfully.")

    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_db()
